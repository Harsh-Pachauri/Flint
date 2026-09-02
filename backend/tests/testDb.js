// tests/testDb.js
//
// Shared helper for spinning up an isolated in-memory MongoDB per test file
// (via mongodb-memory-server, already a project devDependency). Each test
// file gets its own instance and its own fresh Mongoose module registry
// (Jest isolates modules per test file), so setting process.env.MONGODB_URI
// here before requiring ../app is what makes app.js's own connectDB() pick
// up the in-memory instance instead of a real database.
const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');

let mongod;

async function startTestDB() {
  mongod = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongod.getUri();
  process.env.NODE_ENV = process.env.NODE_ENV || 'test';
  process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_jwt_secret_for_automated_tests';
  process.env.REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET || 'test_refresh_secret_for_automated_tests';
}

async function stopTestDB() {
  await mongoose.disconnect();
  if (mongod) {
    await mongod.stop();
  }
}

async function clearTestDB() {
  const collections = mongoose.connection.collections;
  for (const key of Object.keys(collections)) {
    await collections[key].deleteMany({});
  }
}

module.exports = { startTestDB, stopTestDB, clearTestDB };
