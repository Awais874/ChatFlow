const express = require('express');
const mongoose = require('mongoose');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const conversationRoutes = require('./routes/conversations');
const verifyToken = require('./middleware/auth');
const Message = require('./models/message');
const Conversation = require('./models/conversation');

// Create express app FIRST before using it
const app = express();

// Allow requests from React dev server and Vercel production
app.use(cors({
  origin: ['http://localhost:5173', 'https://chat-flow-gold.vercel.app'],
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  credentials: true
}));

app.use(express.json());

// Create HTTP server from express app
const server = http.createServer(app);

// Create Socket.io server — shares same port as Express
const io = new Server(server, {
  cors: {
    origin: ['http://localhost:5173', 'https://chat-flow-gold.vercel.app'],
    methods: ['GET', 'POST']
  }
});

// JWT auth middleware for Socket.io
// Runs before any socket connection is allowed
io.use((socket, next) => {
  const token = socket.handshake.auth.token;

  if (!token) {
    return next(new Error('No token provided'));
  }

  try {
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.user = decoded; // attach userId to socket for use in events
    next();
  } catch (err) {
    return next(new Error('Invalid or expired token'));
  }
});

// Socket.io connection handler
io.on('connection', (socket) => {
  console.log(`✅ User connected: ${socket.user.userId} | Socket ID: ${socket.id}`);

  // Join a conversation room so user receives messages for it
  socket.on('joinRoom', (conversationId) => {
    socket.join(conversationId);
    console.log(`User ${socket.user.userId} joined room: ${conversationId}`);
  });

  // Typing indicator — broadcast to everyone in room except the sender
  // Not saved to DB — purely real-time ephemeral event
  socket.on('typing', (conversationId) => {
    socket.to(conversationId).emit('userTyping', {
      userId: socket.user.userId,
      conversationId,
    });
  });

  // Stop typing — broadcast to everyone in room except the sender
  socket.on('stopTyping', (conversationId) => {
    socket.to(conversationId).emit('userStoppedTyping', {
      userId: socket.user.userId,
      conversationId,
    });
  });

  // Send message — save to MongoDB + broadcast to room
  socket.on('sendMessage', async (data) => {
    try {
      const { conversationId, text } = data;

      // Validate required fields
      if (!conversationId || !text) {
        socket.emit('error', { message: 'conversationId and text are required' });
        return;
      }

      // Save message to MongoDB
      const message = await Message.create({
        conversationId,
        senderId: socket.user.userId,
        text,
      });

      // Update last message preview in conversation
      await Conversation.findByIdAndUpdate(conversationId, {
        lastMessage: text
      });

      // Fetch sender info so frontend can display name and avatar
      // This ensures real-time messages have the same shape as history messages
      const User = require('./models/user');
      const sender = await User.findById(socket.user.userId).select('name email avatar');

      // Broadcast to everyone in the room including sender
      io.to(conversationId).emit('newMessage', {
        _id: message._id,
        conversationId,
        senderId: {
          _id: socket.user.userId,
          name: sender.name,
          email: sender.email,
          avatar: sender.avatar,
        },
        text,
        createdAt: message.createdAt,
      });

    } catch (error) {
      console.error('sendMessage error:', error.message);
      socket.emit('error', { message: 'Failed to send message' });
    }
  });

  // Clean up on disconnect
  socket.on('disconnect', () => {
    console.log(`❌ User disconnected: ${socket.user.userId}`);
  });
});

// REST routes
app.use('/api/auth', authRoutes);
app.use('/api/conversations', conversationRoutes);

// Health check — used by Render to confirm server is alive
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

// Get current logged in user from JWT
app.get('/api/me', verifyToken, (req, res) => {
  res.json({
    message: 'You are authenticated',
    userId: req.user.userId
  });
});

// Search users by name or email — used in new conversation modal
app.get('/api/users/search', verifyToken, async (req, res) => {
  try {
    const { query } = req.query;
    const User = require('./models/user');

    if (!query) {
      return res.status(400).json({ error: 'Search query is required' });
    }

    // Find users matching name or email, exclude the logged in user
    const users = await User.find({
      _id: { $ne: req.user.userId },
      $or: [
        { name: { $regex: query, $options: 'i' } },
        { email: { $regex: query, $options: 'i' } }
      ]
    }).select('name email avatar status').limit(10);

    res.status(200).json({ users });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
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