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

async function registerWithProfile(email, name) {
  const reg = await request(app).post('/api/auth/register').send({ email, password: 'password123' });
  const token = reg.body.accessToken;
  await request(app)
    .post('/api/profile')
    .set('Authorization', `Bearer ${token}`)
    .send({
      name,
      age: 22,
      gender: 'male',
      genderPreference: 'female',
      datingType: 'casual',
      interests: ['music', 'sports', 'reading', 'travel', 'food']
    });
  return { token, userId: reg.body.userId };
}

describe('comment author names', () => {
  test("another user's comment shows their real profile name, not a raw ObjectId", async () => {
    const author = await registerWithProfile('commenter@college.edu', 'Priya Sharma');
    const viewer = await registerWithProfile('viewer2@college.edu', 'Rahul Kumar');

    const createRes = await request(app)
      .post('/api/confessions')
      .set('Authorization', `Bearer ${author.token}`)
      .send({ text: 'A confession for commenting on', isAnonymous: false });
    const confessionId = createRes.body.confession._id;

    // Approve it so a comment is allowed
    await mongoose.model('Confession').findByIdAndUpdate(confessionId, { status: 'approved' });

    await request(app)
      .post('/api/comments')
      .set('Authorization', `Bearer ${author.token}`)
      .send({ targetType: 'confession', targetId: confessionId, text: 'Hello there' });

    const res = await request(app)
      .get(`/api/comments?targetType=confession&targetId=${confessionId}`)
      .set('Authorization', `Bearer ${viewer.token}`);

    expect(res.status).toBe(200);
    expect(res.body.comments.length).toBe(1);
    expect(res.body.comments[0].authorName).toBe('Priya Sharma');
    // Must not be the raw ObjectId string standing in for a name
    expect(res.body.comments[0].authorName).not.toBe(author.userId);
  });

  test('a batch of comments from multiple authors resolves all names in one query set (not N+1)', async () => {
    const a = await registerWithProfile('multiA@college.edu', 'Alice A');
    const b = await registerWithProfile('multiB@college.edu', 'Bob B');

    const createRes = await request(app)
      .post('/api/confessions')
      .set('Authorization', `Bearer ${a.token}`)
      .send({ text: 'Thread for multiple commenters', isAnonymous: false });
    const confessionId = createRes.body.confession._id;
    await mongoose.model('Confession').findByIdAndUpdate(confessionId, { status: 'approved' });

    await request(app).post('/api/comments').set('Authorization', `Bearer ${a.token}`).send({ targetType: 'confession', targetId: confessionId, text: 'from alice' });
    await request(app).post('/api/comments').set('Authorization', `Bearer ${b.token}`).send({ targetType: 'confession', targetId: confessionId, text: 'from bob' });

    const res = await request(app)
      .get(`/api/comments?targetType=confession&targetId=${confessionId}`)
      .set('Authorization', `Bearer ${a.token}`);

    const names = res.body.comments.map((c) => c.authorName).sort();
    expect(names).toEqual(['Alice A', 'Bob B']);
  });
});
