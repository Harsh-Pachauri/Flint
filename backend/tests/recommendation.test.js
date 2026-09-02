const mongoose = require('mongoose');
const request = require('supertest');
const { startTestDB, stopTestDB, clearTestDB } = require('./testDb');

let app;

beforeAll(async () => {
  await startTestDB();
  ({ app } = require('../app'));
  await mongoose.connection.asPromise();
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
      name: overrides.name || 'User',
      age: overrides.age || 22,
      gender: overrides.gender || 'male',
      genderPreference: overrides.genderPreference || 'female',
      datingType: 'casual',
      interests: overrides.interests || ['music', 'sports', 'reading', 'travel', 'food']
    });
  return { token, userId: reg.body.userId };
}

describe('recommendation engine — collaborative & behavior scoring are not silently zero', () => {
  // Regression test for the missing `new` on mongoose.Types.ObjectId(id):
  // that bug made toObjectId() throw on every call (swallowed by its own
  // try/catch into `null`), which meant every $in query keyed on those IDs
  // matched nothing — collapsing collaborativeScore and behaviorScore to 0
  // for every candidate, no matter how much real signal existed.
  test('a candidate with real swipe activity and a similar-user signal scores above zero on collaborative + behavior factors', async () => {
    const viewer = await registerAndOnboard('recviewer@college.edu', { gender: 'male', genderPreference: 'female' });
    const candidate = await registerAndOnboard('reccandidate@college.edu', { gender: 'female', genderPreference: 'both' });
    const similarUser = await registerAndOnboard('recsimilar@college.edu', { gender: 'male', genderPreference: 'female' });
    // A third profile the viewer already liked, that the "similar user" also liked
    const sharedLike = await registerAndOnboard('recshared@college.edu', { gender: 'female', genderPreference: 'both' });

    // viewer liked sharedLike; similarUser also liked sharedLike (collaborative signal)
    await request(app).post('/api/swipe').set('Authorization', `Bearer ${viewer.token}`).send({ toUserId: sharedLike.userId, direction: 'like' });
    await request(app).post('/api/swipe').set('Authorization', `Bearer ${similarUser.token}`).send({ toUserId: sharedLike.userId, direction: 'like' });
    // similarUser also liked the candidate -> collaborative-filtering signal points at candidate
    await request(app).post('/api/swipe').set('Authorization', `Bearer ${similarUser.token}`).send({ toUserId: candidate.userId, direction: 'like' });

    // Give the candidate some behavioral signal: multiple people swiped on them
    const thirdParty = await registerAndOnboard('recthird@college.edu', { gender: 'male', genderPreference: 'female' });
    await request(app).post('/api/swipe').set('Authorization', `Bearer ${thirdParty.token}`).send({ toUserId: candidate.userId, direction: 'like' });

    const res = await request(app)
      .get(`/api/recommendations/${viewer.userId}`)
      .set('Authorization', `Bearer ${viewer.token}`);

    expect(res.status).toBe(200);
    const match = res.body.recommendedProfiles.find((p) => p.profile.userId.toString() === candidate.userId);
    expect(match).toBeTruthy();
    expect(match.breakdown.collaborativeScore).toBeGreaterThan(0);
    expect(match.breakdown.behaviorScore).toBeGreaterThan(0);
  });

  test('a user can only fetch their own recommendations', async () => {
    const a = await registerAndOnboard('recowna@college.edu');
    const b = await registerAndOnboard('recownb@college.edu');

    const res = await request(app)
      .get(`/api/recommendations/${b.userId}`)
      .set('Authorization', `Bearer ${a.token}`);

    expect(res.status).toBe(403);
  });

  test('mutual gender preference filtering applies to recommendations too', async () => {
    const viewer = await registerAndOnboard('recmutual@college.edu', { gender: 'male', genderPreference: 'female' });
    const excluded = await registerAndOnboard('recexcluded@college.edu', { gender: 'female', genderPreference: 'female' });

    const res = await request(app)
      .get(`/api/recommendations/${viewer.userId}`)
      .set('Authorization', `Bearer ${viewer.token}`);

    const ids = res.body.recommendedProfiles.map((p) => p.profile.userId.toString());
    expect(ids).not.toContain(excluded.userId);
  });
});
