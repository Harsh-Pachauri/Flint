const mongoose = require('mongoose');
const request = require('supertest');
const { startTestDB, stopTestDB, clearTestDB } = require('./testDb');

let app;
let Confession;

beforeAll(async () => {
  await startTestDB();
  ({ app } = require('../app'));
  await mongoose.connection.asPromise();
  ({ Confession } = require('../models'));
}, 60000);

afterEach(async () => {
  await clearTestDB();
});

afterAll(async () => {
  await stopTestDB();
});

async function registerWithProfile(email) {
  const reg = await request(app).post('/api/auth/register').send({ email, password: 'password123' });
  const token = reg.body.accessToken;
  await request(app)
    .post('/api/profile')
    .set('Authorization', `Bearer ${token}`)
    .send({
      name: 'User',
      age: 22,
      gender: 'male',
      genderPreference: 'female',
      datingType: 'casual',
      interests: ['music', 'sports', 'reading', 'travel', 'food']
    });
  return { token, userId: reg.body.userId };
}

async function createApprovedConfession(token) {
  const res = await request(app)
    .post('/api/confessions')
    .set('Authorization', `Bearer ${token}`)
    .send({ text: 'React to this', isAnonymous: false });
  await Confession.findByIdAndUpdate(res.body.confession._id, { status: 'approved' });
  return res.body.confession._id;
}

describe('toggleReaction — action field distinguishes add/remove/swap', () => {
  test('a fresh reaction reports action "added" and increments reactionCount by 1', async () => {
    const author = await registerWithProfile('toga@college.edu');
    const reactor = await registerWithProfile('togb@college.edu');
    const confessionId = await createApprovedConfession(author.token);

    const res = await request(app)
      .post('/api/reactions/toggle')
      .set('Authorization', `Bearer ${reactor.token}`)
      .send({ targetType: 'confession', targetId: confessionId, emoji: '❤️' });

    expect(res.status).toBe(201);
    expect(res.body.action).toBe('added');

    const confession = await Confession.findById(confessionId).lean();
    expect(confession.reactionCount).toBe(1);
  });

  test('toggling the same emoji again reports "removed" and decrements reactionCount', async () => {
    const author = await registerWithProfile('togc@college.edu');
    const reactor = await registerWithProfile('togd@college.edu');
    const confessionId = await createApprovedConfession(author.token);

    await request(app).post('/api/reactions/toggle').set('Authorization', `Bearer ${reactor.token}`).send({ targetType: 'confession', targetId: confessionId, emoji: '🔥' });
    const res = await request(app).post('/api/reactions/toggle').set('Authorization', `Bearer ${reactor.token}`).send({ targetType: 'confession', targetId: confessionId, emoji: '🔥' });

    expect(res.body.action).toBe('removed');
    const confession = await Confession.findById(confessionId).lean();
    expect(confession.reactionCount).toBe(0);
  });

  test('swapping to a different emoji reports "swapped" with a net-zero reactionCount delta', async () => {
    const author = await registerWithProfile('toge@college.edu');
    const reactor = await registerWithProfile('togf@college.edu');
    const confessionId = await createApprovedConfession(author.token);

    await request(app).post('/api/reactions/toggle').set('Authorization', `Bearer ${reactor.token}`).send({ targetType: 'confession', targetId: confessionId, emoji: '😂' });
    const before = (await Confession.findById(confessionId).lean()).reactionCount;

    const res = await request(app)
      .post('/api/reactions/toggle')
      .set('Authorization', `Bearer ${reactor.token}`)
      .send({ targetType: 'confession', targetId: confessionId, emoji: '😮' });

    expect(res.body.action).toBe('swapped');
    const after = (await Confession.findById(confessionId).lean()).reactionCount;
    expect(after).toBe(before); // net delta 0, not +1
  });
});

describe('reaction duplicate-key race handling', () => {
  test('near-concurrent identical /react calls never leak a raw MongoDB error', async () => {
    const author = await registerWithProfile('raceA@college.edu');
    const reactor = await registerWithProfile('raceB@college.edu');
    const confessionId = await createApprovedConfession(author.token);

    const results = await Promise.all(
      Array.from({ length: 5 }).map(() =>
        request(app)
          .post('/api/reactions')
          .set('Authorization', `Bearer ${reactor.token}`)
          .send({ targetType: 'confession', targetId: confessionId, emoji: '👏' })
      )
    );

    results.forEach((res) => {
      expect([201, 400]).toContain(res.status);
      if (res.status === 400) {
        expect(String(res.body.error)).not.toMatch(/E11000/);
      }
    });
  });

  test('near-concurrent identical /toggle calls never leak a raw MongoDB error', async () => {
    const author = await registerWithProfile('raceC@college.edu');
    const reactor = await registerWithProfile('raceD@college.edu');
    const confessionId = await createApprovedConfession(author.token);

    const results = await Promise.all(
      Array.from({ length: 5 }).map(() =>
        request(app)
          .post('/api/reactions/toggle')
          .set('Authorization', `Bearer ${reactor.token}`)
          .send({ targetType: 'confession', targetId: confessionId, emoji: '👏' })
      )
    );

    results.forEach((res) => {
      expect([200, 201]).toContain(res.status);
      expect(String(res.body.error || '')).not.toMatch(/E11000/);
    });
  });
});
