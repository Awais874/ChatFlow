const express = require('express');
const mongoose = require('mongoose');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const conversationRoutes = require('./routes/conversations');
const verifyToken = require('./middleware/auth');
const Message = require('./models/Message');
const Conversation = require('./models/Conversation');

// Create express app FIRST before using it
const app = express();

// Then attach middleware to app
app.use(cors({
  origin: 'http://localhost:5173',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  credentials: true
}));

app.use(express.json());

// Create HTTP server from express app
const server = http.createServer(app);

// Create Socket.io server from HTTP server
const io = new Server(server, {
  cors: {
    origin: 'http://localhost:5173',
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
    socket.user = decoded;
    next();
  } catch (err) {
    return next(new Error('Invalid or expired token'));
  }
});

// Socket.io connection handler
io.on('connection', (socket) => {
  console.log(`✅ User connected: ${socket.user.userId} | Socket ID: ${socket.id}`);

  // Join conversation room
  socket.on('joinRoom', (conversationId) => {
    socket.join(conversationId);
    console.log(`User ${socket.user.userId} joined room: ${conversationId}`);
  });

  // Send message
  socket.on('sendMessage', async (data) => {
    try {
      const { conversationId, text } = data;

      if (!conversationId || !text) {
        socket.emit('error', { message: 'conversationId and text are required' });
        return;
      }

      const message = await Message.create({
        conversationId,
        senderId: socket.user.userId,
        text,
      });

      await Conversation.findByIdAndUpdate(conversationId, {
        lastMessage: text
      });

      io.to(conversationId).emit('newMessage', {
        _id: message._id,
        conversationId,
        senderId: socket.user.userId,
        text,
        createdAt: message.createdAt,
      });

    } catch (error) {
      console.error('sendMessage error:', error.message);
      socket.emit('error', { message: 'Failed to send message' });
    }
  });

  socket.on('disconnect', () => {
    console.log(`❌ User disconnected: ${socket.user.userId}`);
  });
});

// REST routes
app.use('/api/auth', authRoutes);
app.use('/api/conversations', conversationRoutes);



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