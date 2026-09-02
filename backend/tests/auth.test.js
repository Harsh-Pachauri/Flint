const mongoose = require('mongoose');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const { startTestDB, stopTestDB, clearTestDB } = require('./testDb');

let app;

beforeAll(async () => {
  await startTestDB();
  ({ app } = require('../app'));
  await mongoose.connection.asPromise();
}, 30000);

afterEach(async () => {
  await clearTestDB();
});

afterAll(async () => {
  await stopTestDB();
});

describe('registration', () => {
  test('registers a new user and returns tokens', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'alice@college.edu', password: 'password123' });

    expect(res.status).toBe(201);
    expect(res.body.accessToken).toBeTruthy();
    expect(res.body.refreshToken).toBeTruthy();
    expect(res.body.onboardingComplete).toBe(false);
  });

  test('rejects a duplicate email', async () => {
    await request(app).post('/api/auth/register').send({ email: 'bob@college.edu', password: 'password123' });
    const res = await request(app).post('/api/auth/register').send({ email: 'bob@college.edu', password: 'password123' });
    expect(res.status).toBe(409);
  });

  test('rejects a short password', async () => {
    const res = await request(app).post('/api/auth/register').send({ email: 'carl@college.edu', password: 'short' });
    expect(res.status).toBe(400);
  });
});

describe('login and authenticated requests', () => {
  async function registerUser(email, password = 'password123') {
    const res = await request(app).post('/api/auth/register').send({ email, password });
    return res.body;
  }

  test('logs in with correct credentials and can call a protected endpoint', async () => {
    await registerUser('dana@college.edu');
    const loginRes = await request(app).post('/api/auth/login').send({ email: 'dana@college.edu', password: 'password123' });
    expect(loginRes.status).toBe(200);
    expect(loginRes.body.accessToken).toBeTruthy();
    expect(loginRes.body.user.role).toBe('user');

    const meRes = await request(app)
      .get('/api/profile/me')
      .set('Authorization', `Bearer ${loginRes.body.accessToken}`);
    // No profile created yet, but auth itself must succeed (401 would mean auth is broken)
    expect(meRes.status).toBe(404);
  });

  test('rejects wrong password', async () => {
    await registerUser('erin@college.edu');
    const res = await request(app).post('/api/auth/login').send({ email: 'erin@college.edu', password: 'wrongpassword' });
    expect(res.status).toBe(401);
  });

  test('rejects requests with no token', async () => {
    const res = await request(app).get('/api/profile/me');
    expect(res.status).toBe(401);
  });

  test('rejects a token signed with the wrong secret (regression: single source of truth for JWT secret)', async () => {
    const bogusToken = jwt.sign({ userId: new mongoose.Types.ObjectId().toString() }, 'not_the_real_secret');
    const res = await request(app).get('/api/profile/me').set('Authorization', `Bearer ${bogusToken}`);
    expect(res.status).toBe(401);
  });

  test('a token issued by the app is accepted by the app (generation and verification use the same secret)', async () => {
    const reg = await registerUser('frank@college.edu');
    const res = await request(app).get('/api/profile/me').set('Authorization', `Bearer ${reg.accessToken}`);
    // 404 (no profile) not 401 (auth failure) proves verification succeeded
    expect(res.status).toBe(404);
  });

  test('refresh returns a usable new token pair', async () => {
    const reg = await registerUser('gina@college.edu');
    const refreshRes = await request(app).post('/api/auth/refresh').send({ refreshToken: reg.refreshToken });
    expect(refreshRes.status).toBe(200);
    expect(refreshRes.body.accessToken).toBeTruthy();

    const meRes = await request(app)
      .get('/api/profile/me')
      .set('Authorization', `Bearer ${refreshRes.body.accessToken}`);
    expect(meRes.status).toBe(404);
  });
});
