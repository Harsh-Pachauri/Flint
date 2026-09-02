// app.js
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const http = require('http');
const socketIO = require('socket.io');
const path = require('path');

// Load environment variables
dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Serve static files for uploaded photos
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Database Connection
const connectDB = require('./config/database');
const migrateAdminRoles = require('./utils/migrateAdminRoles');
connectDB().then(() => migrateAdminRoles());

// Initialize upload service
const { initUploadService } = require('./utils/uploadService');
initUploadService();

// Routes
const apiRoutes = require('./routes');
app.use('/api', apiRoutes); 

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'Dating app API is running',
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});


// Socket.io setup for real-time features
const server = http.createServer(app);
const io = socketIO(server, {
  cors: {
    origin: function (origin, callback) {
      callback(null, true);
    },
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Socket authentication middleware
const jwt = require('jsonwebtoken');
const { getJwtSecret } = require('./utils/tokenService');

io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) {
    return next(new Error('Authentication token required'));
  }

  try {
    const decoded = jwt.verify(token, getJwtSecret());
    socket.userId = decoded.userId;
    next();
  } catch (error) {
    next(new Error('Invalid token'));
  }
});

// Chat WebSocket
const { matchController } = require('./controllers');
matchController.initializeChatSocket(io);

// Story-related WebSocket events
io.on('connection', (socket) => {
  console.log(`User ${socket.userId} connected`);

  // Story events
  socket.on('join:story', (storySessionId) => {
    socket.join(`story:${storySessionId}`);
  });

  socket.on('story:entry-added', (data) => {
    io.to(`story:${data.storySessionId}`).emit('story:entry-added', data);
  });

  socket.on('story:entry-liked', (data) => {
    io.to(`story:${data.storySessionId}`).emit('story:entry-liked', data);
  });

  // WYR events
  socket.on('join:wyr', (wyrSessionId) => {
    socket.join(`wyr:${wyrSessionId}`);
  });

  socket.on('wyr:reveal', (data) => {
    io.to(`wyr:${data.wyrSessionId}`).emit('wyr:reveal', data);
  });

  // Dare Roulette events — same client-driven relay pattern as story/WYR
  // above: the REST endpoints persist the action, the client that made the
  // call re-emits it here so the partner's client updates live.
  socket.on('join:dare', (drSessionId) => {
    socket.join(`dare:${drSessionId}`);
  });

  socket.on('dare:spin-result', (data) => {
    io.to(`dare:${data.drSessionId}`).emit('dare:spin-result', data);
  });

  socket.on('dare:consent-update', (data) => {
    io.to(`dare:${data.drSessionId}`).emit('dare:consent-update', data);
  });

  socket.on('dare:completion-ready', (data) => {
    io.to(`dare:${data.drSessionId}`).emit('dare:completion-ready', data);
  });

  socket.on('disconnect', () => {
    console.log(`User ${socket.userId} disconnected`);
  });
});

module.exports = { app, server, io };
