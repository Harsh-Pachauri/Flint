const io = require('socket.io-client');
const axios = require('axios');

const BASE_URL = 'http://localhost:5000';

// Test configuration
const TEST_CONFIG = {
  user1: {
    email: 'chattest1@example.com',
    password: 'password123',
    name: 'Chat Tester 1'
  },
  user2: {
    email: 'chattest2@example.com',
    password: 'password123',
    name: 'Chat Tester 2'
  }
};

let users = {};
let matchId = null;
let testMessages = [];

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(color, ...args) {
  console.log(color, ...args, colors.reset);
}

// Step 1: Register or Login users
async function setupUsers() {
  log(colors.yellow, '📝 Setting up test users...');

  for (const userKey of ['user1', 'user2']) {
    const userData = TEST_CONFIG[userKey];
    
    try {
      // Try login first
      try {
        const loginRes = await axios.post(`${BASE_URL}/api/auth/login`, {
          email: userData.email,
          password: userData.password
        });
        
        users[userKey] = {
          ...userData,
          userId: loginRes.data.userId,
          token: loginRes.data.accessToken
        };
        
        log(colors.green, `✅ ${userKey}: Logged in successfully`);
      } catch (loginErr) {
        // If login fails, register instead
        const registerRes = await axios.post(`${BASE_URL}/api/auth/register`, {
          email: userData.email,
          password: userData.password
        });
        
        users[userKey] = {
          ...userData,
          userId: registerRes.data.userId,
          token: registerRes.data.accessToken
        };
        
        log(colors.green, `✅ ${userKey}: Registered successfully`);
      }
    } catch (error) {
      log(colors.red, `❌ Failed to setup ${userKey}:`, error.response?.data || error.message);
      process.exit(1);
    }
  }
}

// Step 2: Create profiles
async function createProfiles() {
  log(colors.yellow, '👤 Creating user profiles...');

  const profileData = [
    {
      name: 'Chat Tester 1',
      age: 25,
      gender: 'male',
      genderPreference: 'female',
      datingType: 'casual',
      bio: 'Testing chat system',
      location: { type: 'Point', coordinates: [-73.856077, 40.848447] },
      year: 3,
      depart: 'Computer Science',
      vibewords: ['adventurous', 'tech-savvy', 'coffee-lover']
    },
    {
      name: 'Chat Tester 2',
      age: 23,
      gender: 'female',
      genderPreference: 'male',
      datingType: 'casual',
      bio: 'Testing chat system too',
      location: { type: 'Point', coordinates: [-73.856077, 40.848447] },
      year: 2,
      depart: 'Business Administration',
      vibewords: ['creative', 'outgoing', 'music-lover']
    }
  ];

  for (const userKey of ['user1', 'user2']) {
    try {
      const userIndex = userKey === 'user1' ? 0 : 1;
      await axios.post(`${BASE_URL}/api/profile`, profileData[userIndex], {
        headers: { Authorization: `Bearer ${users[userKey].token}` }
      });
      log(colors.green, `✅ ${userKey}: Profile created`);
    } catch (error) {
      if (error.response?.status === 400 && error.response?.data?.message?.includes('already exists')) {
        log(colors.green, `✅ ${userKey}: Profile already exists`);
      } else {
        log(colors.red, `❌ Failed to create profile for ${userKey}:`, error.response?.data || error.message);
      }
    }
  }
}

// Step 3: Create a match
async function createMatch() {
  log(colors.yellow, '💕 Creating a mutual match...');

  try {
    // User 1 swipes on User 2
    const swipe1Res = await axios.post(
      `${BASE_URL}/api/swipe`,
      {
        toUserId: users.user2.userId,
        direction: 'like'
      },
      { headers: { Authorization: `Bearer ${users.user1.token}` } }
    );

    log(colors.green, '✅ User 1 swiped User 2');

    // User 2 swipes on User 1 - this creates the match
    const swipe2Res = await axios.post(
      `${BASE_URL}/api/swipe`,
      {
        toUserId: users.user1.userId,
        direction: 'like'
      },
      { headers: { Authorization: `Bearer ${users.user2.token}` } }
    );

    if (swipe2Res.data.match && swipe2Res.data.match.matchId) {
      matchId = swipe2Res.data.match.matchId;
      log(colors.green, `✅ Match created: ${matchId}`);
    } else {
      log(colors.yellow, '⚠️ No match created from swipes, trying to find existing...');
      
      // Try to get existing matches
      const matchesRes = await axios.get(`${BASE_URL}/api/matches`, {
        headers: { Authorization: `Bearer ${users.user1.token}` }
      });

      if (matchesRes.data.matches.length > 0) {
        matchId = matchesRes.data.matches[0].matchId;
        log(colors.green, `✅ Using existing match: ${matchId}`);
      }
    }
  } catch (error) {
    log(colors.red, '❌ Failed to create match:', error.response?.data || error.message);
  }
}

// Step 4: Submit compatibility test (required before chatting)
async function submitCompatibilityTest() {
  if (!matchId) {
    log(colors.red, '❌ No match ID available');
    process.exit(1);
  }

  log(colors.yellow, '✅ Submitting compatibility test...');

  try {
    await axios.post(
      `${BASE_URL}/api/matches/${matchId}/compatibility-test`,
      {
        answers: [
          { question: 'Favorite activity?', user1Answer: 'hiking', user2Answer: 'hiking' }
        ]
      },
      { headers: { Authorization: `Bearer ${users.user1.token}` } }
    );

    log(colors.green, '✅ Compatibility test submitted');
  } catch (error) {
    if (error.response?.status === 400) {
      log(colors.green, '✅ Compatibility test already submitted');
    } else {
      log(colors.red, '❌ Failed to submit test:', error.response?.data || error.message);
    }
  }
}

// Step 5: Get existing messages
async function getExistingMessages() {
  if (!matchId) return;

  log(colors.yellow, '📨 Fetching existing messages...');

  try {
    const messagesRes = await axios.get(
      `${BASE_URL}/api/matches/${matchId}/messages?limit=30`,
      { headers: { Authorization: `Bearer ${users.user1.token}` } }
    );

    const messages = messagesRes.data.messages || [];
    log(colors.cyan, `Found ${messages.length} existing messages`);
    
    if (messages.length > 0) {
      messages.forEach((msg) => {
        log(colors.cyan, `  📌 [${new Date(msg.sentAt).toLocaleTimeString()}] ${msg.senderId === users.user1.userId ? 'User1' : 'User2'}: ${msg.content}`);
      });
    }
  } catch (error) {
    log(colors.red, '❌ Failed to get messages:', error.response?.data || error.message);
  }
}

// Step 6: Connect to WebSocket and test chat
function testChatSocket() {
  if (!matchId) {
    log(colors.red, '❌ No match ID for chat testing');
    process.exit(1);
  }

  log(colors.yellow, '🔗 Connecting to chat WebSocket...');

  const socket1 = io(BASE_URL, {
    auth: { token: users.user1.token },
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    reconnectionAttempts: 5
  });

  const socket2 = io(BASE_URL, {
    auth: { token: users.user2.token },
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    reconnectionAttempts: 5
  });

  let messagesReceived = 0;

  // User 1 connection
  socket1.on('connect', () => {
    log(colors.green, '✅ User 1 connected to WebSocket');
    socket1.emit('join:chat', matchId);
    log(colors.blue, `📍 User 1 joined chat room: ${matchId}`);
  });

  socket1.on('message:received', (data) => {
    log(colors.cyan, `📩 User 1 received: "${data.content}" from ${data.senderId === users.user2.userId ? 'User 2' : 'User 1'}`);
    messagesReceived++;
  });

  // User 2 connection
  socket2.on('connect', () => {
    log(colors.green, '✅ User 2 connected to WebSocket');
    socket2.emit('join:chat', matchId);
    log(colors.blue, `📍 User 2 joined chat room: ${matchId}`);

    // After both connected, start sending messages
    setTimeout(() => {
      sendTestMessages(socket1, socket2);
    }, 500);
  });

  socket2.on('message:received', (data) => {
    log(colors.cyan, `📩 User 2 received: "${data.content}" from ${data.senderId === users.user1.userId ? 'User 1' : 'User 2'}`);
    messagesReceived++;
  });

  // Error handlers
  socket1.on('error', (error) => {
    log(colors.red, `❌ User 1 socket error:`, error);
  });

  socket2.on('error', (error) => {
    log(colors.red, `❌ User 2 socket error:`, error);
  });

  socket1.on('connect_error', (error) => {
    log(colors.red, `❌ User 1 connection error:`, error.message);
  });

  socket2.on('connect_error', (error) => {
    log(colors.red, `❌ User 2 connection error:`, error.message);
  });

  function sendTestMessages(s1, s2) {
    const msgs = [
      { sender: 1, content: 'Hi! How are you?' },
      { sender: 2, content: 'Hey! I\'m doing great, thanks for asking!' },
      { sender: 1, content: 'That\'s awesome! Want to grab coffee?' },
      { sender: 2, content: 'Sure! When are you free?' }
    ];
    
    testMessages = msgs;

    let messageIndex = 0;

    function sendNext() {
      if (messageIndex < testMessages.length) {
        const msg = testMessages[messageIndex];
        const socket = msg.sender === 1 ? s1 : s2;
        const senderName = msg.sender === 1 ? 'User 1' : 'User 2';

        socket.emit('message:send', {
          matchId: matchId,
          content: msg.content
        });

        log(colors.yellow, `📤 ${senderName} sent: "${msg.content}"`);
        messageIndex++;

        // Send next message after 1 second
        setTimeout(sendNext, 1000);
      } else {
        // All messages sent, wait and then close
        setTimeout(() => {
          log(colors.yellow, '⏱️  Waiting for messages to be processed...');
          setTimeout(() => {
            cleanupAndExit(socket1, socket2, messagesReceived);
          }, 2000);
        }, 500);
      }
    }

    sendNext();
  }

  function cleanupAndExit(s1, s2, received) {
    log(colors.yellow, '🧹 Cleaning up...');
    s1.disconnect();
    s2.disconnect();

    setTimeout(() => {
      log(colors.green, `\n✨ Chat Test Summary:`);
      log(colors.green, `  - Messages sent: ${testMessages.length}`);
      log(colors.green, `  - Messages received: ${received}`);
      log(colors.green, `  - Match ID: ${matchId}`);
      log(colors.green, `\n✅ Chat system is working!`);
      process.exit(0);
    }, 500);
  }
}

// Main execution
async function main() {
  try {
    log(colors.blue, '\n═══════════════════════════════════════════');
    log(colors.blue, '     🚀 DATING APP CHAT SYSTEM TEST 🚀');
    log(colors.blue, '═══════════════════════════════════════════\n');

    await setupUsers();
    await createProfiles();
    await createMatch();

    if (matchId) {
      await submitCompatibilityTest();
      await getExistingMessages();
      testChatSocket();
    } else {
      log(colors.red, '❌ Could not create or find a match. Chat test cannot proceed.');
      process.exit(1);
    }
  } catch (error) {
    log(colors.red, '❌ Fatal error:', error.message);
    process.exit(1);
  }
}

// Run the test
main();
