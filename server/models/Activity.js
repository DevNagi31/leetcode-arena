const mongoose = require('mongoose');

/**
 * One document per user per active day.
 *
 * This used to be an `activityDates` array embedded in the User document. That
 * array grew without bound — one entry per active day, forever — so a
 * daily-active user accumulated thousands of subdocuments in a single record,
 * and every query that touched the user dragged the whole history along with
 * it. `GET /api/friends` was the worst case: it populated the full activity
 * history of every friend to render a seven-day strip.
 *
 * As its own collection the documents stay small and date ranges are served by
 * an index instead of by loading everything and filtering in memory.
 */
const ActivitySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  // Local calendar day as YYYY-MM-DD. Stored as a string because every
  // consumer (heatmap, streaks, weekly goal) compares whole days, and string
  // comparison on this format is the same as chronological ordering.
  date: {
    type: String,
    required: true,
    match: /^\d{4}-\d{2}-\d{2}$/
  },
  problemsSolved: { type: Number, default: 0 },
  easy: { type: Number, default: 0 },
  medium: { type: Number, default: 0 },
  hard: { type: Number, default: 0 }
});

// One row per user per day, and the index that serves every range query.
ActivitySchema.index({ userId: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('Activity', ActivitySchema);
