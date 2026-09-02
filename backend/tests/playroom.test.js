const mongoose = require('mongoose');
const request = require('supertest');
const { startTestDB, stopTestDB, clearTestDB } = require('./testDb');

let app;
let WYRQuestion;

beforeAll(async () => {
  await startTestDB();
  ({ app } = require('../app'));
  await mongoose.connection.asPromise();
  ({ WYRQuestion } = require('../models'));
}, 60000);

afterEach(async () => {
  await clearTestDB();
});

afterAll(async () => {
  await stopTestDB();
});

async function registerAndMatch() {
  const a = await request(app).post('/api/auth/register').send({ email: 'proomA@college.edu', password: 'password123' });
  const b = await request(app).post('/api/auth/register').send({ email: 'proomB@college.edu', password: 'password123' });
  const tokenA = a.body.accessToken;
  const tokenB = b.body.accessToken;

  await request(app).post('/api/swipe').set('Authorization', `Bearer ${tokenB}`).send({ toUserId: a.body.userId, direction: 'like' });
  const swipeRes = await request(app).post('/api/swipe').set('Authorization', `Bearer ${tokenA}`).send({ toUserId: b.body.userId, direction: 'like' });
  const matchId = swipeRes.body.match.matchId;

  return { tokenA, tokenB, userIdA: a.body.userId, userIdB: b.body.userId, matchId };
}

describe('playroom — wouldYouRather is unlockable and playable', () => {
  test('a fresh playroom includes wouldYouRather in unlockedFeatures', async () => {
    const { tokenA, matchId } = await registerAndMatch();
    const res = await request(app).get(`/api/matches/${matchId}/playroom`).set('Authorization', `Bearer ${tokenA}`);
    expect(res.status).toBe(200);
    expect(res.body.unlockedFeatures).toContain('wouldYouRather');
  });

  test('starting a wouldYouRather session seeds real questions', async () => {
    const { tokenA, matchId } = await registerAndMatch();
    const playroomRes = await request(app).get(`/api/matches/${matchId}/playroom`).set('Authorization', `Bearer ${tokenA}`);
    const playroomId = playroomRes.body.playroomId;

    const startRes = await request(app)
      .post(`/api/playroom/${playroomId}/session`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ gameType: 'wouldYouRather' });

    expect(startRes.status).toBe(201);
    expect(startRes.body.gameSession).toBeTruthy();

    const questions = await WYRQuestion.find({ wyrSessionId: startRes.body.gameSession });
    expect(questions.length).toBeGreaterThan(0);

    const sessionRes = await request(app)
      .get(`/api/wyr/${startRes.body.gameSession}`)
      .set('Authorization', `Bearer ${tokenA}`);
    expect(sessionRes.status).toBe(200);
    expect(sessionRes.body.questions.length).toBe(questions.length);
  });

  test('getPlayroom resolves the type-specific game session id for an active game (resume support)', async () => {
    const { tokenA, tokenB, matchId } = await registerAndMatch();
    const playroomRes = await request(app).get(`/api/matches/${matchId}/playroom`).set('Authorization', `Bearer ${tokenA}`);
    const playroomId = playroomRes.body.playroomId;

    const startRes = await request(app)
      .post(`/api/playroom/${playroomId}/session`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ gameType: 'dareRoulette' });

    // Simulate reopening the playroom later (as the OTHER user) — the
    // active session's type-specific id must be resolvable without having
    // seen startGameSession's original response.
    const reopenRes = await request(app).get(`/api/matches/${matchId}/playroom`).set('Authorization', `Bearer ${tokenB}`);
    expect(reopenRes.status).toBe(200);
    expect(reopenRes.body.activeSession).toBeTruthy();
    expect(reopenRes.body.activeSession.gameType).toBe('dareRoulette');
    expect(reopenRes.body.activeSession.gameSessionId).toBe(startRes.body.gameSession);
  });
});
