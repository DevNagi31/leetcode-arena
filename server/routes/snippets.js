const express = require('express');
const router = express.Router();
const Snippet = require('../models/Snippet');
const auth = require('../middleware/auth');

// @route GET /api/snippets
// @desc Get all snippets for current user
router.get('/', auth, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const skip = (page - 1) * limit;

    const query = { userId: req.userId };
    const [snippets, total] = await Promise.all([
      Snippet.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Snippet.countDocuments(query)
    ]);

    const totalPages = Math.ceil(total / limit);
    res.json({ snippets, page, totalPages, total });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// @route POST /api/snippets
// @desc Create new snippet
router.post('/', auth, async (req, res) => {
  try {
    const { problemName, difficulty, language, code, runtime, memory, topics, link } = req.body;
    const snippet = new Snippet({
      userId: req.userId,
      problemName,
      difficulty,
      language,
      code,
      runtime,
      memory,
      topics,
      link
    });
    await snippet.save();
    res.json(snippet);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// @route PUT /api/snippets/:id
// @desc Update snippet
router.put('/:id', auth, async (req, res) => {
  try {
    const snippet = await Snippet.findOne({ _id: req.params.id, userId: req.userId });
    if (!snippet) return res.status(404).json({ message: 'Snippet not found' });

    const { problemName, difficulty, language, code, runtime, memory, topics, link } = req.body;
    if (problemName !== undefined) snippet.problemName = problemName;
    if (difficulty !== undefined) snippet.difficulty = difficulty;
    if (language !== undefined) snippet.language = language;
    if (code !== undefined) snippet.code = code;
    if (runtime !== undefined) snippet.runtime = runtime;
    if (memory !== undefined) snippet.memory = memory;
    if (topics !== undefined) snippet.topics = topics;
    if (link !== undefined) snippet.link = link;
    snippet.updatedAt = Date.now();
    await snippet.save();
    res.json(snippet);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// @route DELETE /api/snippets/:id
// @desc Delete snippet
router.delete('/:id', auth, async (req, res) => {
  try {
    const result = await Snippet.deleteOne({ _id: req.params.id, userId: req.userId });
    if (result.deletedCount === 0) return res.status(404).json({ message: 'Snippet not found' });
    res.json({ message: 'Snippet deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
