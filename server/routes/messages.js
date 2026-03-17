const express = require('express');
const router = express.Router();
const Message = require('../models/Message');
const auth = require('../middleware/auth');

// @route GET /api/messages/:friendId
// @desc Get message history with a friend
router.get('/:friendId', auth, async (req, res) => {
  try {
    const messages = await Message.find({
      $or: [
        { from: req.userId, to: req.params.friendId },
        { from: req.params.friendId, to: req.userId }
      ]
    }).sort({ createdAt: 1 }).limit(100);

    res.json(messages);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// @route POST /api/messages/send
// @desc Send a message
router.post('/send', auth, async (req, res) => {
  try {
    const { to, content } = req.body;

    const message = new Message({
      from: req.userId,
      to,
      content
    });

    await message.save();
    res.json(message);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// @route PUT /api/messages/mark-read/:friendId
// @desc Mark messages as read
router.put('/mark-read/:friendId', auth, async (req, res) => {
  try {
    await Message.updateMany(
      { from: req.params.friendId, to: req.userId, read: false },
      { read: true }
    );
    res.json({ message: 'Messages marked as read' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
