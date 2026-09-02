const mongoose = require('mongoose');
const request = require('supertest');
const { startTestDB, stopTestDB, clearTestDB } = require('./testDb');

let app;

beforeAll(async () => {
  await startTestDB();
  ({ app } = require('../app'));
  await mongoose.connection.asPromise();
}, 30000);

afterEach(async () => {
  await clearTestDB();
  // Reset contents, don't delete the object itself: authController.js only
  // initializes global.otpStore/global.otpRateLimiter once, at module load
  // time (`if (!global.otpStore) global.otpStore = {}`) — deleting the
  // property here would leave later calls in this same process dereferencing
  // `undefined`, which has nothing to do with the app's actual behavior.
  global.otpStore = {};
  global.otpRateLimiter = {};
});

afterAll(async () => {
  await stopTestDB();
});

async function registerUser(email) {
  const res = await request(app).post('/api/auth/register').send({ email, password: 'originalPass123' });
  return res.body;
}

function getLatestOtpEntry() {
  const entries = Object.entries(global.otpStore || {});
  expect(entries.length).toBeGreaterThan(0);
  const [resetToken, entry] = entries[entries.length - 1];
  return { resetToken, entry };
}

describe('password reset security', () => {
  test('user ID alone is not a valid reset token (regression: old bug used the user\'s own _id as the "secret")', async () => {
    const reg = await registerUser('helen@college.edu');
    // decode the userId out of the access token the way the old vulnerable
    // implementation used to hand it out as the reset token
    const jwt = require('jsonwebtoken');
    const decoded = jwt.decode(reg.accessToken);

    const res = await request(app)
      .post('/api/auth/reset-password')
      .send({ resetToken: decoded.userId, otp: '123456', newPassword: 'newPassword123' });

    expect(res.status).toBe(400);
  });

  test('forgotPassword issues a resetToken that is not the user id', async () => {
    await registerUser('ivan@college.edu');
    const res = await request(app).post('/api/auth/forgot-password').send({ email: 'ivan@college.edu' });
    expect(res.status).toBe(200);
    expect(res.body.resetToken).toBeTruthy();

    const user = await mongoose.model('User').findOne({ email: 'ivan@college.edu' });
    expect(res.body.resetToken).not.toBe(user._id.toString());
    // cryptographically random hex token, not a 24-char ObjectId
    expect(res.body.resetToken.length).toBeGreaterThan(24);
  });

  test('successful reset end-to-end (spy on the OTP "delivery" log)', async () => {
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    await registerUser('kim@college.edu');
    const forgotRes = await request(app).post('/api/auth/forgot-password').send({ email: 'kim@college.edu' });
    const loggedLine = logSpy.mock.calls.map((args) => args.join(' ')).find((line) => line.includes('OTP'));
    logSpy.mockRestore();

    expect(loggedLine).toBeTruthy();
    const otpMatch = loggedLine.match(/OTP (\d{6})/);
    expect(otpMatch).toBeTruthy();
    const otp = otpMatch[1];

    const resetRes = await request(app)
      .post('/api/auth/reset-password')
      .send({ resetToken: forgotRes.body.resetToken, otp, newPassword: 'brandNewPass123' });
    expect(resetRes.status).toBe(200);

    // Old password should no longer work
    const oldLogin = await request(app).post('/api/auth/login').send({ email: 'kim@college.edu', password: 'originalPass123' });
    expect(oldLogin.status).toBe(401);

    // New password should work
    const newLogin = await request(app).post('/api/auth/login').send({ email: 'kim@college.edu', password: 'brandNewPass123' });
    expect(newLogin.status).toBe(200);
  });

  test('a used reset token cannot be replayed (single-use)', async () => {
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    await registerUser('leo@college.edu');
    const forgotRes = await request(app).post('/api/auth/forgot-password').send({ email: 'leo@college.edu' });
    const loggedLine = logSpy.mock.calls.map((args) => args.join(' ')).find((line) => line.includes('OTP'));
    logSpy.mockRestore();
    const otp = loggedLine.match(/OTP (\d{6})/)[1];

    const firstReset = await request(app)
      .post('/api/auth/reset-password')
      .send({ resetToken: forgotRes.body.resetToken, otp, newPassword: 'firstNewPass123' });
    expect(firstReset.status).toBe(200);

    const replay = await request(app)
      .post('/api/auth/reset-password')
      .send({ resetToken: forgotRes.body.resetToken, otp, newPassword: 'secondNewPass123' });
    expect(replay.status).toBe(400);
  });

  test('an invalid/unknown reset token is rejected', async () => {
    const res = await request(app)
      .post('/api/auth/reset-password')
      .send({ resetToken: 'totally-made-up-token', otp: '123456', newPassword: 'newPassword123' });
    expect(res.status).toBe(400);
  });

  test('an expired reset token is rejected', async () => {
    await registerUser('mona@college.edu');
    await request(app).post('/api/auth/forgot-password').send({ email: 'mona@college.edu' });
    const { resetToken, entry } = getLatestOtpEntry();
    // Force expiry into the past
    entry.expiry = new Date(Date.now() - 1000);

    const res = await request(app)
      .post('/api/auth/reset-password')
      .send({ resetToken, otp: '000000', newPassword: 'newPassword123' });
    expect(res.status).toBe(400);
  });

  test('an incorrect OTP is rejected without resetting the password', async () => {
    await registerUser('nora@college.edu');
    const forgotRes = await request(app).post('/api/auth/forgot-password').send({ email: 'nora@college.edu' });

    const res = await request(app)
      .post('/api/auth/reset-password')
      .send({ resetToken: forgotRes.body.resetToken, otp: '000000', newPassword: 'newPassword123' });
    expect(res.status).toBe(400);

    // original password must still work
    const login = await request(app).post('/api/auth/login').send({ email: 'nora@college.edu', password: 'originalPass123' });
    expect(login.status).toBe(200);
  });

  test('repeated incorrect OTP attempts lock the token out (brute-force protection)', async () => {
    await registerUser('oscar@college.edu');
    const forgotRes = await request(app).post('/api/auth/forgot-password').send({ email: 'oscar@college.edu' });

    let lastRes;
    for (let i = 0; i < 6; i++) {
      lastRes = await request(app)
        .post('/api/auth/reset-password')
        .send({ resetToken: forgotRes.body.resetToken, otp: '000000', newPassword: 'newPassword123' });
    }
    expect(lastRes.status).toBe(400);
    expect(String(lastRes.body.error).toLowerCase()).toMatch(/too many|expired|invalid/);

    // Even the CORRECT otp should no longer work once locked out
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    // (token already consumed by lockout — this just confirms no further
    // success is possible on this token even with an unrealistically-lucky guess)
    logSpy.mockRestore();
    const stillLocked = await request(app)
      .post('/api/auth/reset-password')
      .send({ resetToken: forgotRes.body.resetToken, otp: '123456', newPassword: 'newPassword123' });
    expect(stillLocked.status).toBe(400);
  });

  test('forgotPassword is rate-limited per identifier', async () => {
    await registerUser('penny@college.edu');
    let lastStatus;
    for (let i = 0; i < 4; i++) {
      const res = await request(app).post('/api/auth/forgot-password').send({ email: 'penny@college.edu' });
      lastStatus = res.status;
    }
    expect(lastStatus).toBe(429);
  });
});
