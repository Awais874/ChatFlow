const express = require('express');
const mongoose = require('mongoose');
const http = require('http');
const { Server } = require('socket.io');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const verifyToken = require('./middleware/auth');

// Create express app
const app = express();
app.use(express.json());

// Create HTTP server from express app
const server = http.createServer(app);

// Create Socket.io server from HTTP server
const io = new Server(server, {
  cors: {
    origin: 'http://localhost:5173', // React dev server port
    methods: ['GET', 'POST']
  }
});

// JWT auth middleware for Socket.io
io.use((socket, next) => {
  const token = socket.handshake.auth.token;

  if (!token) {
    return next(new Error('No token provided'));
  }

  try {
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.user = decoded; // attach user to socket
    next(); // allow connection
  } catch (err) {
    return next(new Error('Invalid or expired token'));
  }
});

// Socket.io connection handler
io.on('connection', (socket) => {
  console.log(`✅ User connected: ${socket.user.userId} | Socket ID: ${socket.id}`);

  socket.on('disconnect', () => {
    console.log(`❌ User disconnected: ${socket.user.userId}`);
  });
});

// REST routes
app.use('/api/auth', authRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

app.get('/api/me', verifyToken, (req, res) => {
  res.json({ 
    message: 'You are authenticated',
    userId: req.user.userId 
  });
});

const PORT = process.env.PORT || 5000;

mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('✅ Connected to MongoDB');
    server.listen(PORT, () => {
      console.log(`✅ Server running on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('❌ MongoDB connection error:', err.message);
  });