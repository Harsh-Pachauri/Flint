const mongoose = require('mongoose');
const request = require('supertest');
const { startTestDB, stopTestDB, clearTestDB } = require('./testDb');

let app;
let Match, Notification, Swipe;

beforeAll(async () => {
  await startTestDB();
  ({ app } = require('../app'));
  await mongoose.connection.asPromise();
  ({ Match, Notification, Swipe } = require('../models'));
}, 30000);

afterEach(async () => {
  await clearTestDB();
});

afterAll(async () => {
  await stopTestDB();
});

async function registerAndOnboard(email, overrides = {}) {
  const reg = await request(app).post('/api/auth/register').send({ email, password: 'password123' });
  const token = reg.body.accessToken;
  const profile = await request(app)
    .post('/api/profile')
    .set('Authorization', `Bearer ${token}`)
    .send({
      name: overrides.name || 'Test User',
      age: overrides.age || 22,
      gender: overrides.gender || 'male',
      genderPreference: overrides.genderPreference || 'female',
      datingType: 'casual',
      interests: ['music', 'sports', 'reading', 'travel', 'food'],
      ...overrides.payload
    });
  return { token, userId: reg.body.userId, profileRes: profile };
}

describe('swipe -> match idempotency', () => {
  test('a mutual like creates exactly one match and notifies both users', async () => {
    const a = await registerAndOnboard('amy@college.edu', { gender: 'female', genderPreference: 'male' });
    const b = await registerAndOnboard('ben@college.edu', { gender: 'male', genderPreference: 'female' });

    // b likes a first (pending)
    await request(app).post('/api/swipe').set('Authorization', `Bearer ${b.token}`).send({ toUserId: a.userId, direction: 'like' });

    // a likes b back -> mutual match
    const res = await request(app).post('/api/swipe').set('Authorization', `Bearer ${a.token}`).send({ toUserId: b.userId, direction: 'like' });

    expect(res.status).toBe(200);
    expect(res.body.match).toBeTruthy();

    const matches = await Match.find({ status: 'active' });
    expect(matches.length).toBe(1);

    const notifs = await Notification.find({ type: 'match' });
    expect(notifs.length).toBe(2);
  });

  test('repeating the exact same swipe request does not create a duplicate match or extra notifications', async () => {
    const a = await registerAndOnboard('cara@college.edu', { gender: 'female', genderPreference: 'male' });
    const b = await registerAndOnboard('dave@college.edu', { gender: 'male', genderPreference: 'female' });

    await request(app).post('/api/swipe').set('Authorization', `Bearer ${b.token}`).send({ toUserId: a.userId, direction: 'like' });

    // Simulate a client retry: the same "like" request fired twice in a row
    await request(app).post('/api/swipe').set('Authorization', `Bearer ${a.token}`).send({ toUserId: b.userId, direction: 'like' });
    await request(app).post('/api/swipe').set('Authorization', `Bearer ${a.token}`).send({ toUserId: b.userId, direction: 'like' });

    const matches = await Match.find({ status: 'active' });
    expect(matches.length).toBe(1);

    const swipes = await Swipe.find({});
    // Exactly 2 swipe records total (one per user), not 3
    expect(swipes.length).toBe(2);

    const notifs = await Notification.find({ type: 'match' });
    expect(notifs.length).toBe(2);
  });

  test('requesting a swipe again after a match already exists is a no-op, not a new match', async () => {
    const a = await registerAndOnboard('emi@college.edu', { gender: 'female', genderPreference: 'male' });
    const b = await registerAndOnboard('finn@college.edu', { gender: 'male', genderPreference: 'female' });

    await request(app).post('/api/swipe').set('Authorization', `Bearer ${b.token}`).send({ toUserId: a.userId, direction: 'like' });
    const first = await request(app).post('/api/swipe').set('Authorization', `Bearer ${a.token}`).send({ toUserId: b.userId, direction: 'like' });
    expect(first.body.match).toBeTruthy();
    const matchId = first.body.match.matchId;

    // b "likes" a again (e.g. duplicate UI action) — should just resolve to the same match
    const again = await request(app).post('/api/swipe').set('Authorization', `Bearer ${b.token}`).send({ toUserId: a.userId, direction: 'like' });
    expect(again.body.match.matchId).toBe(matchId);

    const matches = await Match.find({ status: 'active' });
    expect(matches.length).toBe(1);
  });

  test('near-concurrent duplicate swipe requests still only create one match', async () => {
    const a = await registerAndOnboard('gia@college.edu', { gender: 'female', genderPreference: 'male' });
    const b = await registerAndOnboard('hank@college.edu', { gender: 'male', genderPreference: 'female' });

    await request(app).post('/api/swipe').set('Authorization', `Bearer ${b.token}`).send({ toUserId: a.userId, direction: 'like' });

    // Fire several identical requests concurrently
    const requests = Array.from({ length: 5 }).map(() =>
      request(app).post('/api/swipe').set('Authorization', `Bearer ${a.token}`).send({ toUserId: b.userId, direction: 'like' })
    );
    const results = await Promise.all(requests);
    results.forEach((r) => expect(r.status).toBe(200));

    const matches = await Match.find({ status: 'active' });
    expect(matches.length).toBe(1);

    const swipes = await Swipe.find({ fromUserId: a.userId, toUserId: b.userId });
    expect(swipes.length).toBe(1);
  });

  test('cannot swipe on yourself', async () => {
    const a = await registerAndOnboard('ivy@college.edu');
    const res = await request(app).post('/api/swipe').set('Authorization', `Bearer ${a.token}`).send({ toUserId: a.userId, direction: 'like' });
    expect(res.status).toBe(400);
  });
});

describe('mutual gender preference filtering', () => {
  async function seedFeed() {
    const viewer = await registerAndOnboard('viewer@college.edu', { gender: 'male', genderPreference: 'female' });
    // Candidate wants only women — should NOT see or be shown to a male viewer
    const excluded = await registerAndOnboard('excluded@college.edu', { gender: 'female', genderPreference: 'female' });
    // Candidate is open to everyone — should be included
    const included = await registerAndOnboard('included@college.edu', { gender: 'female', genderPreference: 'both' });
    return { viewer, excluded, included };
  }

  test('feed excludes candidates whose own preference does not include the viewer', async () => {
    const { viewer, excluded, included } = await seedFeed();
    const res = await request(app).get('/api/feed?page=1&limit=20').set('Authorization', `Bearer ${viewer.token}`);
    expect(res.status).toBe(200);
    const returnedIds = res.body.profiles.map((p) => (p.userId ? p.userId.toString() : ''));
    expect(returnedIds).not.toContain(excluded.userId);
    expect(returnedIds).toContain(included.userId);
  });
});
