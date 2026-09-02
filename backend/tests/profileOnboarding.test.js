const mongoose = require('mongoose');
const request = require('supertest');
const { startTestDB, stopTestDB, clearTestDB } = require('./testDb');

let app;
let College, Profile;

beforeAll(async () => {
  await startTestDB();
  ({ app } = require('../app'));
  await mongoose.connection.asPromise();
  ({ College, Profile } = require('../models'));
}, 60000);

afterEach(async () => {
  await clearTestDB();
});

afterAll(async () => {
  await stopTestDB();
});

async function register(email) {
  const res = await request(app).post('/api/auth/register').send({ email, password: 'password123' });
  return { token: res.body.accessToken, userId: res.body.userId };
}

const basicProfilePayload = {
  name: 'Test User',
  age: 22,
  gender: 'male',
  genderPreference: 'female',
  datingType: 'casual',
  interests: ['music', 'sports', 'reading', 'travel', 'food']
};

describe('profile creation — location', () => {
  test('never defaults to [0, 0] when no location is supplied', async () => {
    const user = await register('loc1@college.edu');
    await request(app).post('/api/profile').set('Authorization', `Bearer ${user.token}`).send(basicProfilePayload);

    const profile = await Profile.findOne({ userId: user.userId }).lean();
    // No coordinates set at all, rather than the old hardcoded [0, 0]
    const coords = profile.location && profile.location.coordinates;
    if (coords) {
      expect(coords.length).toBe(0);
    }
  });

  test('accepts and persists valid real coordinates', async () => {
    const user = await register('loc2@college.edu');
    const res = await request(app)
      .post('/api/profile')
      .set('Authorization', `Bearer ${user.token}`)
      .send({ ...basicProfilePayload, location: { coordinates: [77.5946, 12.9716] } });

    expect(res.status).toBe(201);
    const profile = await Profile.findOne({ userId: user.userId }).lean();
    expect(profile.location.coordinates).toEqual([77.5946, 12.9716]);
  });

  test('rejects invalid coordinates rather than silently dropping or accepting them', async () => {
    const user = await register('loc3@college.edu');
    const res = await request(app)
      .post('/api/profile')
      .set('Authorization', `Bearer ${user.token}`)
      .send({ ...basicProfilePayload, location: { coordinates: [999, 999] } });

    expect(res.status).toBe(400);
  });

  test('updateMyProfile also validates coordinates', async () => {
    const user = await register('loc4@college.edu');
    await request(app).post('/api/profile').set('Authorization', `Bearer ${user.token}`).send(basicProfilePayload);

    const badUpdate = await request(app)
      .put('/api/profile/me')
      .set('Authorization', `Bearer ${user.token}`)
      .send({ location: { coordinates: [200, 200] } });
    expect(badUpdate.status).toBe(400);

    const goodUpdate = await request(app)
      .put('/api/profile/me')
      .set('Authorization', `Bearer ${user.token}`)
      .send({ location: { coordinates: [-122.4194, 37.7749] } });
    expect(goodUpdate.status).toBe(200);
  });
});

describe('profile creation — college', () => {
  test('resolves a real collegeId and persists it', async () => {
    const college = await College.create({ name: 'Test Institute of Technology', city: 'Testville', country: 'Testland' });
    const user = await register('col1@college.edu');

    const res = await request(app)
      .post('/api/profile')
      .set('Authorization', `Bearer ${user.token}`)
      .send({ ...basicProfilePayload, collegeId: college._id.toString() });

    expect(res.status).toBe(201);
    const profile = await Profile.findOne({ userId: user.userId }).lean();
    expect(profile.collegeId.toString()).toBe(college._id.toString());
  });

  test('rejects a collegeId that does not correspond to a real College document', async () => {
    const user = await register('col2@college.edu');
    const fakeId = new mongoose.Types.ObjectId().toString();

    const res = await request(app)
      .post('/api/profile')
      .set('Authorization', `Bearer ${user.token}`)
      .send({ ...basicProfilePayload, collegeId: fakeId });

    expect(res.status).toBe(400);
  });

  test('profile creation still succeeds with no collegeId at all (college data may not be seeded)', async () => {
    const user = await register('col3@college.edu');
    const res = await request(app).post('/api/profile').set('Authorization', `Bearer ${user.token}`).send(basicProfilePayload);
    expect(res.status).toBe(201);
  });

  test('college search resolves real College documents (used by onboarding to find a collegeId)', async () => {
    await College.create({ name: 'Searchable University', city: 'Searchtown', country: 'Searchland' });
    const user = await register('col4@college.edu');

    const res = await request(app)
      .get('/api/colleges/search?query=Searchable')
      .set('Authorization', `Bearer ${user.token}`);

    expect(res.status).toBe(200);
    expect(res.body.colleges.length).toBeGreaterThan(0);
    expect(res.body.colleges[0].name).toMatch(/Searchable/);
  });
});

describe('photo upload — missing profile', () => {
  test('uploading photos before a profile exists returns 404, not a raw 500', async () => {
    const user = await register('photo1@college.edu');
    const res = await request(app)
      .post('/api/profile/photos')
      .set('Authorization', `Bearer ${user.token}`)
      .attach('photos', Buffer.from('fake-image-bytes'), { filename: 'a.jpg', contentType: 'image/jpeg' });

    expect(res.status).toBe(404);
  });
});

describe('onboarding completion gate', () => {
  test('cannot complete onboarding without at least one photo', async () => {
    const user = await register('onb1@college.edu');
    await request(app).post('/api/profile').set('Authorization', `Bearer ${user.token}`).send(basicProfilePayload);

    const res = await request(app)
      .post('/api/onboarding/complete')
      .set('Authorization', `Bearer ${user.token}`);

    expect(res.status).toBe(400);
  });
});
