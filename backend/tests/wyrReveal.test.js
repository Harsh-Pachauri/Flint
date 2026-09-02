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

async function registerAndMatch() {
  const a = await request(app).post('/api/auth/register').send({ email: 'wyrA@college.edu', password: 'password123' });
  const b = await request(app).post('/api/auth/register').send({ email: 'wyrB@college.edu', password: 'password123' });
  const tokenA = a.body.accessToken;
  const tokenB = b.body.accessToken;

  await request(app).post('/api/swipe').set('Authorization', `Bearer ${tokenB}`).send({ toUserId: a.body.userId, direction: 'like' });
  const swipeRes = await request(app).post('/api/swipe').set('Authorization', `Bearer ${tokenA}`).send({ toUserId: b.body.userId, direction: 'like' });
  const matchId = swipeRes.body.match.matchId;

  const playroomRes = await request(app).get(`/api/matches/${matchId}/playroom`).set('Authorization', `Bearer ${tokenA}`);
  const startRes = await request(app)
    .post(`/api/playroom/${playroomRes.body.playroomId}/session`)
    .set('Authorization', `Bearer ${tokenA}`)
    .send({ gameType: 'wouldYouRather' });

  return { tokenA, tokenB, userIdA: a.body.userId, userIdB: b.body.userId, wyrSessionId: startRes.body.gameSession };
}

describe('would you rather — partner answer only surfaces after reveal', () => {
  test('before both answer, the partner answer is not exposed to either user', async () => {
    const { tokenA, tokenB, wyrSessionId } = await registerAndMatch();
    const sessionRes = await request(app).get(`/api/wyr/${wyrSessionId}`).set('Authorization', `Bearer ${tokenA}`);
    const questionId = sessionRes.body.questions[0].questionId;

    await request(app).post(`/api/wyr/question/${questionId}/answer`).set('Authorization', `Bearer ${tokenA}`).send({ chosenOption: 'A' });

    const stateA = await request(app).get(`/api/wyr/${wyrSessionId}`).set('Authorization', `Bearer ${tokenA}`);
    const stateB = await request(app).get(`/api/wyr/${wyrSessionId}`).set('Authorization', `Bearer ${tokenB}`);

    expect(stateA.body.questions[0].userAnswer.chosenOption).toBe('A');
    expect(stateA.body.questions[0].partnerAnswer).toBeNull();
    expect(stateB.body.questions[0].userAnswer).toBeNull();
    expect(stateB.body.questions[0].partnerAnswer).toBeNull();
  });

  test('once both answer, each side can see the other\'s actual choice', async () => {
    const { tokenA, tokenB, wyrSessionId } = await registerAndMatch();
    const sessionRes = await request(app).get(`/api/wyr/${wyrSessionId}`).set('Authorization', `Bearer ${tokenA}`);
    const questionId = sessionRes.body.questions[0].questionId;

    await request(app).post(`/api/wyr/question/${questionId}/answer`).set('Authorization', `Bearer ${tokenA}`).send({ chosenOption: 'A' });
    const secondRes = await request(app).post(`/api/wyr/question/${questionId}/answer`).set('Authorization', `Bearer ${tokenB}`).send({ chosenOption: 'B' });

    expect(secondRes.body.isRevealed).toBe(true);
    expect(secondRes.body.syncMatch).toBe(false);

    const stateA = await request(app).get(`/api/wyr/${wyrSessionId}`).set('Authorization', `Bearer ${tokenA}`);
    const stateB = await request(app).get(`/api/wyr/${wyrSessionId}`).set('Authorization', `Bearer ${tokenB}`);

    expect(stateA.body.questions[0].partnerAnswer.chosenOption).toBe('B');
    expect(stateB.body.questions[0].partnerAnswer.chosenOption).toBe('A');
  });
});
