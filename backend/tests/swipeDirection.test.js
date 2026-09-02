const mongoose = require('mongoose');
const request = require('supertest');
const { startTestDB, stopTestDB, clearTestDB } = require('./testDb');

let app;
let Swipe;

beforeAll(async () => {
  await startTestDB();
  ({ app } = require('../app'));
  await mongoose.connection.asPromise();
  ({ Swipe } = require('../models'));
}, 60000);

afterEach(async () => {
  await clearTestDB();
});

afterAll(async () => {
  await stopTestDB();
});

async function registerAndOnboard(email, overrides = {}) {
  const reg = await request(app).post('/api/auth/register').send({ email, password: 'password123' });
  const token = reg.body.accessToken;
  await request(app)
    .post('/api/profile')
    .set('Authorization', `Bearer ${token}`)
    .send({
      name: 'User',
      age: 22,
      gender: overrides.gender || 'male',
      genderPreference: overrides.genderPreference || 'female',
      datingType: 'casual',
      interests: ['music', 'sports', 'reading', 'travel', 'food']
    });
  return { token, userId: reg.body.userId };
}

describe('acceptSwipe / rejectSwipe direction correctness', () => {
  test('acceptSwipe treats a prior "pass" as no existing like (not as already-satisfied), and explicitly accepting converts it to a like', async () => {
    const a = await registerAndOnboard('sda@college.edu', { gender: 'female', genderPreference: 'male' });
    const b = await registerAndOnboard('sdb@college.edu', { gender: 'male', genderPreference: 'female' });

    // a already passed on b in the past
    await request(app).post('/api/swipe').set('Authorization', `Bearer ${a.token}`).send({ toUserId: b.userId, direction: 'pass' });

    // b likes a -> a gets an incoming swipe to accept. Because the reverse-
    // swipe lookup correctly requires direction:'like', a's prior 'pass'
    // must NOT be mistaken for an existing like — this swipe must stay
    // unmatched until a explicitly accepts.
    const swipeRes = await request(app).post('/api/swipe').set('Authorization', `Bearer ${b.token}`).send({ toUserId: a.userId, direction: 'like' });
    expect(swipeRes.body.match).toBeNull();

    const incoming = await request(app).get('/api/swipes/incoming').set('Authorization', `Bearer ${a.token}`);
    const swipeId = incoming.body.swipes[0].swipeId;

    const acceptRes = await request(app).post(`/api/swipes/${swipeId}/accept`).set('Authorization', `Bearer ${a.token}`);
    expect(acceptRes.status).toBe(200);
    expect(acceptRes.body.match).toBeTruthy();

    // Explicitly accepting is a deliberate decision to reciprocate: a's only
    // swipe record toward b should now be an accepted 'like' — the unique
    // (fromUserId, toUserId) index means the old 'pass' is converted in
    // place rather than coexisting with a separate new record.
    const aToB = await Swipe.find({ fromUserId: a.userId, toUserId: b.userId });
    expect(aToB.length).toBe(1);
    expect(aToB[0].direction).toBe('like');
    expect(aToB[0].status).toBe('accepted');
  });

  test('rejectSwipe still records the rejection even if the rejecter had previously liked the sender', async () => {
    const a = await registerAndOnboard('sdc@college.edu', { gender: 'female', genderPreference: 'male' });
    const b = await registerAndOnboard('sdd@college.edu', { gender: 'male', genderPreference: 'female' });

    // a already liked b (still pending, not yet mutual)
    await request(app).post('/api/swipe').set('Authorization', `Bearer ${a.token}`).send({ toUserId: b.userId, direction: 'like' });

    // b likes a -> a gets an incoming swipe
    await request(app).post('/api/swipe').set('Authorization', `Bearer ${b.token}`).send({ toUserId: a.userId, direction: 'like' });

    const incoming = await request(app).get('/api/swipes/incoming').set('Authorization', `Bearer ${a.token}`);
    const swipeId = incoming.body.swipes[0].swipeId;

    const rejectRes = await request(app).post(`/api/swipes/${swipeId}/reject`).set('Authorization', `Bearer ${a.token}`);
    expect(rejectRes.status).toBe(200);

    const originalSwipe = await Swipe.findById(swipeId);
    expect(originalSwipe.status).toBe('rejected');
  });
});
