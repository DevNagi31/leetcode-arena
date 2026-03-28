const express = require('express');
const router = express.Router();
const User = require('../models/User');
const FriendRequest = require('../models/FriendRequest');
const auth = require('../middleware/auth');
const { calculateTier } = require('../utils/tier');

// @route GET /api/friends
// @desc Get my friends list
router.get('/', auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId)
      .populate('friends', 'username leetcodeUsername problems easy medium hard score country institutionName currentStreak activityDates');
    res.json(user.friends || []);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// @route GET /api/friends/leaderboard
// @desc Get friends leaderboard (friends + self, sorted by score)
router.get('/leaderboard', auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId)
      .select('friends username leetcodeUsername problems easy medium hard score country institutionName currentStreak');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Get friend IDs plus self
    const ids = [...(user.friends || []), user._id];

    const users = await User.find({ _id: { $in: ids } })
      .select('username leetcodeUsername problems easy medium hard score country institutionName currentStreak')
      .sort({ score: -1, problems: -1 });

    const leaderboard = users.map((u, index) => ({
      ...u.toObject(),
      rank: index + 1,
      tier: calculateTier(u.score)
    }));

    res.json(leaderboard);
  } catch (error) {
    console.error('Friends leaderboard error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route GET /api/friends/requests
// @desc Get pending friend requests
router.get('/requests', auth, async (req, res) => {
  try {
    const requests = await FriendRequest.find({
      to: req.userId,
      status: 'pending'
    }).populate('from', 'username leetcodeUsername problems score country institutionName');
    res.json(requests);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// @route POST /api/friends/send
// @desc Send friend request by username
router.post('/send', auth, async (req, res) => {
  try {
    const { username } = req.body;

    // Find target user
    const targetUser = await User.findOne({ username });
    if (!targetUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Can't add yourself
    if (targetUser._id.toString() === req.userId) {
      return res.status(400).json({ message: 'You cannot add yourself' });
    }

    // Check if already friends
    const currentUser = await User.findById(req.userId);
    if (currentUser.friends.includes(targetUser._id)) {
      return res.status(400).json({ message: 'Already friends' });
    }

    // Check if request already exists
    const existing = await FriendRequest.findOne({
      $or: [
        { from: req.userId, to: targetUser._id },
        { from: targetUser._id, to: req.userId }
      ],
      status: 'pending'
    });

    if (existing) {
      return res.status(400).json({ message: 'Friend request already sent' });
    }

    // Create request
    const request = new FriendRequest({
      from: req.userId,
      to: targetUser._id
    });
    await request.save();

    res.json({ message: `Friend request sent to ${username}!` });
  } catch (error) {
    console.error('Send friend request error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route POST /api/friends/accept/:requestId
// @desc Accept friend request
router.post('/accept/:requestId', auth, async (req, res) => {
  try {
    const request = await FriendRequest.findById(req.params.requestId);

    if (!request) {
      return res.status(404).json({ message: 'Request not found' });
    }

    if (request.to.toString() !== req.userId) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    // Update request status
    request.status = 'accepted';
    await request.save();

    // Add each other as friends
    await User.findByIdAndUpdate(req.userId, {
      $addToSet: { friends: request.from }
    });
    await User.findByIdAndUpdate(request.from, {
      $addToSet: { friends: req.userId }
    });

    res.json({ message: 'Friend request accepted!' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// @route POST /api/friends/decline/:requestId
// @desc Decline friend request
router.post('/decline/:requestId', auth, async (req, res) => {
  try {
    const request = await FriendRequest.findById(req.params.requestId);

    if (!request) {
      return res.status(404).json({ message: 'Request not found' });
    }

    if (request.to.toString() !== req.userId) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    request.status = 'declined';
    await request.save();

    res.json({ message: 'Friend request declined' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// @route DELETE /api/friends/:friendId
// @desc Remove friend
router.delete('/:friendId', auth, async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.userId, {
      $pull: { friends: req.params.friendId }
    });
    await User.findByIdAndUpdate(req.params.friendId, {
      $pull: { friends: req.userId }
    });

    res.json({ message: 'Friend removed' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// @route GET /api/friends/search/:username
// @desc Search users by username
router.get('/search/:username', auth, async (req, res) => {
  try {
    const escaped = req.params.username.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const users = await User.find({
      username: { $regex: escaped, $options: 'i' },
      _id: { $ne: req.userId }
    }).select('username leetcodeUsername problems easy medium hard score country institutionName currentStreak').limit(10);

    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
