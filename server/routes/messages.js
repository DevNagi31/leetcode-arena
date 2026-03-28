const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Message = require('../models/Message');
const User = require('../models/User');
const auth = require('../middleware/auth');

// Helper: verify friendship
const areFriends = async (userId1, userId2) => {
  const user = await User.findById(userId1).select('friends');
  return user && user.friends.some(f => f.toString() === userId2.toString());
};

// @route GET /api/messages/unread/count
// @desc Get unread message counts per friend (must be before /:friendId)
router.get('/unread/count', auth, async (req, res) => {
  try {
    const counts = await Message.aggregate([
      { $match: { to: new mongoose.Types.ObjectId(req.userId), read: false } },
      { $group: { _id: '$from', count: { $sum: 1 } } }
    ]);
    const result = {};
    counts.forEach(c => { result[c._id.toString()] = c.count; });
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// @route GET /api/messages/:friendId
// @desc Get message history with a friend
router.get('/:friendId', auth, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.friendId)) {
      return res.status(400).json({ message: 'Invalid user ID' });
    }
    if (!await areFriends(req.userId, req.params.friendId)) {
      return res.status(403).json({ message: 'You can only message friends' });
    }

    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 50));
    const skip = (page - 1) * limit;

    const query = {
      $or: [
        { from: req.userId, to: req.params.friendId },
        { from: req.params.friendId, to: req.userId }
      ]
    };

    const [messages, total] = await Promise.all([
      Message.find(query).sort({ createdAt: 1 }).skip(skip).limit(limit),
      Message.countDocuments(query)
    ]);

    // Mark as read
    await Message.updateMany(
      { from: req.params.friendId, to: req.userId, read: false },
      { read: true }
    );

    const totalPages = Math.ceil(total / limit);
    res.json({ messages, page, totalPages, total });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// @route POST /api/messages/send
// @desc Send a message
router.post('/send', auth, async (req, res) => {
  try {
    const { to, content } = req.body;

    if (!to || !mongoose.Types.ObjectId.isValid(to)) {
      return res.status(400).json({ message: 'Invalid recipient' });
    }

    if (!content || typeof content !== 'string' || !content.trim()) {
      return res.status(400).json({ message: 'Message content is required' });
    }

    const trimmed = content.trim();
    if (trimmed.length > 1000) {
      return res.status(400).json({ message: 'Message too long (max 1000 characters)' });
    }

    if (!await areFriends(req.userId, to)) {
      return res.status(403).json({ message: 'You can only message friends' });
    }

    const message = new Message({
      from: req.userId,
      to,
      content: trimmed
    });

    await message.save();
    res.json(message);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
