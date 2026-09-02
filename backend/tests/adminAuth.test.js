const mongoose = require('mongoose');
const request = require('supertest');
const { startTestDB, stopTestDB, clearTestDB } = require('./testDb');

let app;
let User, Confession;

beforeAll(async () => {
  await startTestDB();
  ({ app } = require('../app'));
  await mongoose.connection.asPromise();
  ({ User, Confession } = require('../models'));
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

describe('admin authorization (single source of truth via User.role)', () => {
  test('a regular user cannot list pending confessions', async () => {
    const user = await register('reguser@college.edu');
    const res = await request(app).get('/api/confessions/pending').set('Authorization', `Bearer ${user.token}`);
    expect(res.status).toBe(403);
  });

  test('a user with role=admin can list and approve pending confessions', async () => {
    const admin = await register('adminuser@college.edu');
    await User.findByIdAndUpdate(admin.userId, { role: 'admin' });

    const author = await register('confauthor@college.edu');
    const created = await request(app)
      .post('/api/confessions')
      .set('Authorization', `Bearer ${author.token}`)
      .send({ text: 'Needs moderation', isAnonymous: true });

    const pendingRes = await request(app).get('/api/confessions/pending').set('Authorization', `Bearer ${admin.token}`);
    expect(pendingRes.status).toBe(200);
    expect(pendingRes.body.confessions.some((c) => c._id === created.body.confession._id)).toBe(true);

    const approveRes = await request(app)
      .patch(`/api/confessions/${created.body.confession._id}/approve`)
      .set('Authorization', `Bearer ${admin.token}`);
    expect(approveRes.status).toBe(200);

    const confession = await Confession.findById(created.body.confession._id).lean();
    expect(confession.status).toBe('approved');
  });

  test('the legacy whitelisted admin emails are migrated to role=admin on startup', async () => {
    // authController.register doesn't collect a display name, so simulate a
    // pre-existing account the way the old whitelist would have applied to.
    const reg = await request(app).post('/api/auth/register').send({ email: 'flintdating@outlook.com', password: 'password123' });
    expect(reg.status).toBe(201);

    const migrateAdminRoles = require('../utils/migrateAdminRoles');
    await migrateAdminRoles();

    const user = await User.findOne({ email: 'flintdating@outlook.com' }).lean();
    expect(user.role).toBe('admin');
  });

  test('admin status is consistent across confessions, comments, and reactions (previously 4 separate out-of-sync whitelists)', async () => {
    const admin = await register('crossadmin@college.edu');
    await User.findByIdAndUpdate(admin.userId, { role: 'admin' });

    const author = await register('crossauthor@college.edu');
    const commentAuthor = await register('crosscommenter@college.edu');

    const confRes = await request(app)
      .post('/api/confessions')
      .set('Authorization', `Bearer ${author.token}`)
      .send({ text: 'Cross-surface admin check', isAnonymous: false });
    await Confession.findByIdAndUpdate(confRes.body.confession._id, { status: 'approved' });

    const commentRes = await request(app)
      .post('/api/comments')
      .set('Authorization', `Bearer ${commentAuthor.token}`)
      .send({ targetType: 'confession', targetId: confRes.body.confession._id, text: 'a comment' });

    // Admin (not the comment's author) can delete the comment on any of the
    // previously-inconsistent surfaces.
    const deleteRes = await request(app)
      .delete(`/api/comments/${commentRes.body.comment._id}`)
      .set('Authorization', `Bearer ${admin.token}`);
    expect(deleteRes.status).toBe(200);
  });
});
