const mongoose = require('mongoose');
const request = require('supertest');
const { startTestDB, stopTestDB } = require('./testDb');

let app;

beforeAll(async () => {
  await startTestDB();
  ({ app } = require('../app'));
  await mongoose.connection.asPromise();
}, 30000);

afterAll(async () => {
  await stopTestDB();
});

test('health check responds and DB is connected', async () => {
  const res = await request(app).get('/health');
  expect(res.status).toBe(200);
  expect(mongoose.connection.readyState).toBe(1);
});
