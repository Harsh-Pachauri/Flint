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
connectDB();

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
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) {
    return next(new Error('Authentication token required'));
  }

  const jwt = require('jsonwebtoken');
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
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

  socket.on('disconnect', () => {
    console.log(`User ${socket.userId} disconnected`);
  });
});

module.exports = { app, server, io };
