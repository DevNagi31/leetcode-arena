const express = require('express');
const router = express.Router();
const Note = require('../models/Note');
const auth = require('../middleware/auth');

// @route GET /api/notes
// @desc Get all notes for current user
router.get('/', auth, async (req, res) => {
  try {
    const notes = await Note.find({ userId: req.userId }).sort({ updatedAt: -1 });
    res.json(notes);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// @route POST /api/notes
// @desc Create new note
router.post('/', auth, async (req, res) => {
  try {
    const { problemName, difficulty, content, resources, personalRating, topics } = req.body;
    const note = new Note({
      userId: req.userId,
      problemName,
      difficulty,
      content,
      resources,
      personalRating,
      topics
    });
    await note.save();
    res.json(note);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// @route PUT /api/notes/:id
// @desc Update note
router.put('/:id', auth, async (req, res) => {
  try {
    const note = await Note.findOne({ _id: req.params.id, userId: req.userId });
    if (!note) return res.status(404).json({ message: 'Note not found' });

    const { problemName, difficulty, content, resources, personalRating, topics } = req.body;
    if (problemName !== undefined) note.problemName = problemName;
    if (difficulty !== undefined) note.difficulty = difficulty;
    if (content !== undefined) note.content = content;
    if (resources !== undefined) note.resources = resources;
    if (personalRating !== undefined) note.personalRating = personalRating;
    if (topics !== undefined) note.topics = topics;
    note.updatedAt = Date.now();
    await note.save();
    res.json(note);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// @route DELETE /api/notes/:id
// @desc Delete note
router.delete('/:id', auth, async (req, res) => {
  try {
    const result = await Note.deleteOne({ _id: req.params.id, userId: req.userId });
    if (result.deletedCount === 0) return res.status(404).json({ message: 'Note not found' });
    res.json({ message: 'Note deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
