const express = require('express');
const mongoose = require('mongoose');
const Message = require('../models/message');
const Conversation = require('../models/conversation');
const verifyToken = require('../middleware/auth');

const router = express.Router();

// GET /api/users/search?query=john
// Search for users by name or email — used in new conversation modal
router.get('/users/search', verifyToken, async (req, res) => {
  try {
    const { query } = req.query;
    const User = require('../models/user');

    if (!query) {
      return res.status(400).json({ error: 'Search query is required' });
    }

    // Search by name or email, case insensitive, exclude self
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

// POST /api/conversations — create a new conversation
// If a direct conversation already exists between these two users, return it
router.post('/', verifyToken, async (req, res) => {
  try {
    const { name, type, participants } = req.body;

    // Always include the creator, remove duplicates with Set
    const allParticipants = [...new Set([
      req.user.userId,
      ...(participants || [])
    ])];

    // For direct chats — check if conversation already exists
    // between these exact two people before creating a new one
    // This prevents duplicate conversations with the same person
    if (type === 'direct' && allParticipants.length === 2) {
      const existing = await Conversation.findOne({
        type: 'direct',
        participants: { $all: allParticipants, $size: 2 }
      });

      // Return existing conversation instead of creating a duplicate
      if (existing) {
        return res.status(200).json(existing);
      }
    }

    // No existing conversation — create a new one
    const conversation = await Conversation.create({
      name: name || 'New Conversation',
      type: type || 'direct',
      participants: allParticipants
    });

    res.status(201).json(conversation);

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/conversations/:id/messages — get paginated message history
router.get('/:id/messages', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const page  = parseInt(req.query.page)  || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip  = (page - 1) * limit;

    const messages = await Message.find({ conversationId: id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('senderId', 'name email avatar');

    const total = await Message.countDocuments({ conversationId: id });

    res.status(200).json({
      messages: messages.reverse(), // oldest first for correct chat display
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: page < Math.ceil(total / limit)
      }
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/conversations — get all conversations for logged in user
router.get('/', verifyToken, async (req, res) => {
  try {
    const conversations = await Conversation.find({
      participants: new mongoose.Types.ObjectId(req.user.userId)
    })
      .sort({ updatedAt: -1 })
      .populate('participants', 'name email avatar status');

    res.status(200).json({ conversations });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;