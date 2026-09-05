const express = require('express');
const router = express.Router();
const Note = require('../models/Note');
const auth = require('../middleware/auth');
const { validate, objectIdParam, noteValidation } = require('../middleware/validation');
const imageStore = require('../services/imageStore');

/** Upload every new photo through the store; keep existing ones untouched. */
const sanitizeNewImages = (images) =>
  Promise.all((Array.isArray(images) ? images : []).map((i) => imageStore.put(i)))
    .then((r) => r.filter(Boolean));

/**
 * Reconcile the submitted list against what's stored.
 *
 * The client re-sends an unchanged photo as just its `_id`, so editing a note
 * never re-uploads bytes that didn't change. Anything carrying `data` is a new
 * upload; anything else must match an existing id or it's dropped. Photos the
 * user removed are deleted from the backing store.
 */
const mergeImages = async (current, submitted) => {
  if (!Array.isArray(submitted)) return current;
  const byId = new Map((current || []).map((i) => [i._id.toString(), i]));

  const next = [];
  const keptIds = new Set();
  for (const img of submitted) {
    if (img && img.data && img.mimeType) {
      const stored = await imageStore.put(img);
      if (stored) next.push(stored);
    } else if (img && img._id && byId.has(String(img._id))) {
      keptIds.add(String(img._id));
      next.push(byId.get(String(img._id)));
    }
  }

  // Best-effort cleanup of anything dropped, so removing a photo doesn't
  // silently orphan it in the bucket.
  for (const [id, img] of byId) {
    if (!keptIds.has(id)) imageStore.remove(img);
  }

  return next;
};

/** Responses echo the note back without the blobs, matching the list shape. */
const stripImageData = (note) => {
  const o = note.toObject();
  o.images = (o.images || []).map(({ data, ...rest }) => rest);
  return o;
};

// @route GET /api/notes
// @desc Get all notes for current user
router.get('/', auth, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const skip = (page - 1) * limit;

    const query = { userId: req.userId };
    const [notes, total] = await Promise.all([
      // Never ship photo bytes in a list — four photos on ten notes would be
      // tens of megabytes. Callers fetch them per note from /:id/images.
      Note.find(query).select('-images.data').sort({ updatedAt: -1 }).skip(skip).limit(limit),
      Note.countDocuments(query)
    ]);

    const totalPages = Math.ceil(total / limit);
    res.json({ notes, page, totalPages, total });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// @route POST /api/notes
// @desc Create new note
router.post('/', auth, noteValidation(), validate, async (req, res) => {
  try {
    const { problemName, difficulty, content, resources, personalRating, topics, images } = req.body;
    const note = new Note({
      userId: req.userId,
      problemName,
      difficulty,
      content,
      resources,
      personalRating,
      topics,
      images: await sanitizeNewImages(images)
    });
    await note.save();
    res.json(stripImageData(note));
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// @route PUT /api/notes/:id
// @desc Update note
router.put('/:id', auth, objectIdParam, noteValidation({ optional: true }), validate, async (req, res) => {
  try {
    const note = await Note.findOne({ _id: req.params.id, userId: req.userId });
    if (!note) return res.status(404).json({ message: 'Note not found' });

    const { problemName, difficulty, content, resources, personalRating, topics, images } = req.body;
    if (problemName !== undefined) note.problemName = problemName;
    if (difficulty !== undefined) note.difficulty = difficulty;
    if (content !== undefined) note.content = content;
    if (resources !== undefined) note.resources = resources;
    if (personalRating !== undefined) note.personalRating = personalRating;
    if (topics !== undefined) note.topics = topics;
    if (images !== undefined) note.images = await mergeImages(note.images, images);
    note.updatedAt = Date.now();
    await note.save();
    res.json(stripImageData(note));
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// @route GET /api/notes/:id/images
// @desc Full photo payload for one note, fetched only when it's displayed
router.get('/:id/images', auth, objectIdParam, validate, async (req, res) => {
  try {
    const note = await Note.findOne({ _id: req.params.id, userId: req.userId }).select('images');
    if (!note) return res.status(404).json({ message: 'Note not found' });
    res.json({ images: (note.images || []).map(imageStore.toPublic) });
  } catch (error) {
    console.error('Fetch note images error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route DELETE /api/notes/:id
// @desc Delete note
router.delete('/:id', auth, objectIdParam, validate, async (req, res) => {
  try {
    const note = await Note.findOne({ _id: req.params.id, userId: req.userId }).select('images');
    if (!note) return res.status(404).json({ message: 'Note not found' });

    await Note.deleteOne({ _id: note._id });
    // Release any bucket assets so deleting a note doesn't leak storage.
    for (const img of note.images || []) imageStore.remove(img);

    res.json({ message: 'Note deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
