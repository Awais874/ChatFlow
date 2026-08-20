const express = require('express');
const Message = require('../models/Message');
const Conversation = require('../models/Conversation');
const verifyToken = require('../middleware/auth');

const router = express.Router();



// POST /api/conversations — create a new conversation
router.post('/', verifyToken, async (req, res) => {
  try {
    const { name, type, participants } = req.body;

    // Always include the creator in participants
   
const allParticipants = [...new Set([
  req.user.userId,
  ...(participants || [])
])];

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



// GET /api/conversations/:id/messages
router.get('/:id/messages', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    // Get messages for this conversation
    const messages = await Message.find({ conversationId: id })
      .sort({ createdAt: -1 }) // newest first
      .skip(skip)
      .limit(limit)
      .populate('senderId', 'name email avatar');

    // Get total count for pagination info
    const total = await Message.countDocuments({ conversationId: id });

    res.status(200).json({
      messages: messages.reverse(), // reverse to show oldest first in UI
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
      participants: req.user.userId
    })
      .sort({ updatedAt: -1 })
      .populate('participants', 'name email avatar status');

    res.status(200).json({ conversations });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;