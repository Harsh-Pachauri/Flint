const mongoose = require('mongoose');
const request = require('supertest');
const { startTestDB, stopTestDB, clearTestDB } = require('./testDb');

let app;
let Match, Playroom, PlayroomSession, DareRouletteSession, DareSpin, DareConsent;

beforeAll(async () => {
  await startTestDB();
  ({ app } = require('../app'));
  await mongoose.connection.asPromise();
  ({ Match, Playroom, PlayroomSession, DareRouletteSession, DareSpin, DareConsent } = require('../models'));
}, 30000);

afterEach(async () => {
  await clearTestDB();
});

afterAll(async () => {
  await stopTestDB();
});

async function registerUser(email) {
  const res = await request(app).post('/api/auth/register').send({ email, password: 'password123' });
  return { token: res.body.accessToken, userId: res.body.userId };
}

describe('malformed ObjectId route params', () => {
  test('a malformed :matchId returns 400, not a raw 500', async () => {
    const user = await registerUser('mal1@college.edu');
    const res = await request(app)
      .get('/api/matches/not-a-real-id')
      .set('Authorization', `Bearer ${user.token}`);
    expect(res.status).toBe(400);
  });

  test('a malformed :userId on the public profile route returns 400', async () => {
    const res = await request(app).get('/api/profile/not-a-real-id');
    expect(res.status).toBe(400);
  });
});

describe('playroom authorization (IDOR protection)', () => {
  async function seedPlayroomForMatch(userAId, userBId) {
    const match = await Match.create({ userIds: [userAId, userBId], status: 'active' });
    const playroom = await Playroom.create({
      matchId: match._id,
      spiceLevel: 1,
      unlockedFeatures: ['storyBuilding', 'dareRoulette'],
      isActive: true
    });
    return { match, playroom };
  }

  test('a user who is not part of the match cannot start a game session for it', async () => {
    const a = await registerUser('pa@college.edu');
    const b = await registerUser('pb@college.edu');
    const outsider = await registerUser('outsider@college.edu');
    const { playroom } = await seedPlayroomForMatch(a.userId, b.userId);

    const res = await request(app)
      .post(`/api/playroom/${playroom._id}/session`)
      .set('Authorization', `Bearer ${outsider.token}`)
      .send({ gameType: 'dareRoulette' });

    expect(res.status).toBe(403);
  });

  test('a legitimate match participant CAN start a game session', async () => {
    const a = await registerUser('pc@college.edu');
    const b = await registerUser('pd@college.edu');
    const { playroom } = await seedPlayroomForMatch(a.userId, b.userId);

    const res = await request(app)
      .post(`/api/playroom/${playroom._id}/session`)
      .set('Authorization', `Bearer ${a.token}`)
      .send({ gameType: 'dareRoulette' });

    expect(res.status).toBe(201);
  });

  test('a user who is not part of the match cannot end a game session for it', async () => {
    const a = await registerUser('pe@college.edu');
    const b = await registerUser('pf@college.edu');
    const outsider = await registerUser('outsider2@college.edu');
    const { playroom } = await seedPlayroomForMatch(a.userId, b.userId);

    const startRes = await request(app)
      .post(`/api/playroom/${playroom._id}/session`)
      .set('Authorization', `Bearer ${a.token}`)
      .send({ gameType: 'dareRoulette' });

    const res = await request(app)
      .patch(`/api/playroom/${playroom._id}/session/${startRes.body.sessionId}/end`)
      .set('Authorization', `Bearer ${outsider.token}`);

    expect(res.status).toBe(403);
  });
});

describe('dare consent authorization + de-duplication', () => {
  async function seedSpinForMatch(userAId, userBId, currentTurnUserId) {
    const match = await Match.create({ userIds: [userAId, userBId], status: 'active' });
    const playroom = await Playroom.create({ matchId: match._id, unlockedFeatures: ['dareRoulette'], isActive: true });
    const playSession = await PlayroomSession.create({
      playroomId: playroom._id,
      gameType: 'dareRoulette',
      status: 'active',
      currentRound: 1,
      currentTurnUserId
    });
    const drSession = await DareRouletteSession.create({ sessionId: playSession._id, status: 'active' });
    const spin = await DareSpin.create({
      drSessionId: drSession._id,
      spinByUserId: currentTurnUserId,
      landedCategory: 'truth',
      roundNumber: 1
    });
    return { match, spin };
  }

  test('an unrelated user cannot submit consent for someone else\'s spin', async () => {
    const a = await registerUser('da@college.edu');
    const b = await registerUser('db@college.edu');
    const outsider = await registerUser('doutsider@college.edu');
    const { spin } = await seedSpinForMatch(a.userId, b.userId, a.userId);

    const res = await request(app)
      .post(`/api/dare/spin/${spin._id}/consent`)
      .set('Authorization', `Bearer ${outsider.token}`)
      .send({ accepted: true });

    expect(res.status).toBe(403);
    const consents = await DareConsent.find({ spinId: spin._id });
    expect(consents.length).toBe(0);
  });

  test('a participant cannot submit consent twice for the same spin', async () => {
    const a = await registerUser('dc@college.edu');
    const b = await registerUser('dd@college.edu');
    const { spin } = await seedSpinForMatch(a.userId, b.userId, a.userId);

    const first = await request(app)
      .post(`/api/dare/spin/${spin._id}/consent`)
      .set('Authorization', `Bearer ${a.token}`)
      .send({ accepted: true });
    expect(first.status).toBe(201);

    const second = await request(app)
      .post(`/api/dare/spin/${spin._id}/consent`)
      .set('Authorization', `Bearer ${a.token}`)
      .send({ accepted: true });
    expect(second.status).toBe(400);

    const consents = await DareConsent.find({ spinId: spin._id, userId: a.userId });
    expect(consents.length).toBe(1);
  });

  test('both real participants consenting reveals the dare card to the right person', async () => {
    const a = await registerUser('de@college.edu');
    const b = await registerUser('df@college.edu');
    const { spin } = await seedSpinForMatch(a.userId, b.userId, a.userId);

    await request(app).post(`/api/dare/spin/${spin._id}/consent`).set('Authorization', `Bearer ${a.token}`).send({ accepted: true });
    const res = await request(app).post(`/api/dare/spin/${spin._id}/consent`).set('Authorization', `Bearer ${b.token}`).send({ accepted: true });

    expect(res.status).toBe(200);
    expect(res.body.allConsented).toBe(true);
    expect(res.body.dareCard).toBeTruthy();
  });
});
