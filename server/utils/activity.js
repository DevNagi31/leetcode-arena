const Activity = require('../models/Activity');

/**
 * Helpers for the per-day activity records that back the heatmap, streaks and
 * the weekly goal.
 *
 * All day boundaries are UTC. LeetCode reports progress in UTC, and the server
 * has no way to know a given caller's timezone, so one fixed reference frame is
 * the only self-consistent option.
 */

const toDateStr = (d) => d.toISOString().split('T')[0];
const todayStr = () => toDateStr(new Date());
const daysAgoStr = (n) => toDateStr(new Date(Date.now() - n * 86400000));

/** First day (Sunday) of the current UTC week, as YYYY-MM-DD. */
const weekStartStr = () => {
  const now = new Date();
  const start = new Date(now);
  start.setUTCDate(now.getUTCDate() - now.getUTCDay());
  return toDateStr(start);
};

/**
 * Record newly solved problems against today.
 *
 * Only called with a positive `solved`: writing a row on every refresh, as the
 * old embedded-array version did, marked idle users active and inflated both
 * the streak counters and the heatmap.
 */
async function recordSolved(userId, solved, { easy, medium, hard }) {
  if (!solved || solved <= 0) return;
  await Activity.updateOne(
    { userId, date: todayStr() },
    {
      $inc: { problemsSolved: solved },
      // The difficulty split is a running total from LeetCode, not a delta,
      // so it is set rather than incremented.
      $set: { easy, medium, hard },
    },
    { upsert: true }
  );
}

/** Activity rows for a user, newest window first-to-last, oldest to newest. */
async function getRecentActivity(userId, days = 366) {
  return Activity.find({ userId, date: { $gte: daysAgoStr(days) } })
    .select('date problemsSolved easy medium hard -_id')
    .sort({ date: 1 })
    .lean();
}

/** Every active day for a user, as bare date strings. */
async function getActiveDates(userId) {
  const rows = await Activity.find({ userId })
    .select('date -_id')
    .sort({ date: 1 })
    .lean();
  return rows.map((r) => r.date);
}

function countActiveDays(userId) {
  return Activity.countDocuments({ userId });
}

/** Problems solved so far in the current week. */
async function getWeeklyProgress(userId) {
  const [agg] = await Activity.aggregate([
    { $match: { userId, date: { $gte: weekStartStr() } } },
    { $group: { _id: null, total: { $sum: '$problemsSolved' } } },
  ]);
  return agg?.total || 0;
}

/**
 * Current and longest streak from a sorted list of YYYY-MM-DD strings.
 * Kept pure so it stays trivially testable.
 */
function calculateStreaks(sortedDates) {
  if (!sortedDates || sortedDates.length === 0) {
    return { currentStreak: 0, longestStreak: 0 };
  }

  const dayNumber = (s) => Math.floor(Date.parse(`${s}T00:00:00Z`) / 86400000);

  let longestStreak = 1;
  let run = 1;
  for (let i = 1; i < sortedDates.length; i++) {
    const gap = dayNumber(sortedDates[i]) - dayNumber(sortedDates[i - 1]);
    if (gap === 1) run++;
    else if (gap > 1) run = 1;
    // gap === 0 (a duplicate day) leaves the run untouched.
    longestStreak = Math.max(longestStreak, run);
  }

  // A streak is only "current" if it reaches today or yesterday — one missed
  // day is forgiven so the count doesn't reset before the user has had a
  // chance to solve anything.
  let currentStreak = 0;
  const last = sortedDates[sortedDates.length - 1];
  if (last === todayStr() || last === daysAgoStr(1)) {
    currentStreak = 1;
    for (let i = sortedDates.length - 2; i >= 0; i--) {
      const gap = dayNumber(sortedDates[i + 1]) - dayNumber(sortedDates[i]);
      if (gap === 1) currentStreak++;
      else if (gap > 1) break;
    }
  }

  return { currentStreak, longestStreak };
}

/**
 * Last seven days of activity for many users at once, plus each user's total
 * active-day count.
 *
 * Two queries regardless of how many friends the caller has or how much
 * history each one carries — the friends list previously loaded every friend's
 * entire activity array to render a seven-day strip.
 */
async function getWeekActivityForUsers(userIds) {
  if (!userIds || userIds.length === 0) return { byUser: {}, counts: {} };

  const [rows, countRows] = await Promise.all([
    Activity.find({ userId: { $in: userIds }, date: { $gte: daysAgoStr(7) } })
      .select('userId date problemsSolved -_id')
      .lean(),
    Activity.aggregate([
      { $match: { userId: { $in: userIds } } },
      { $group: { _id: '$userId', count: { $sum: 1 } } },
    ]),
  ]);

  const byUser = {};
  for (const r of rows) {
    (byUser[r.userId.toString()] ||= []).push({
      date: r.date,
      problemsSolved: r.problemsSolved,
    });
  }

  const counts = {};
  for (const c of countRows) counts[c._id.toString()] = c.count;

  return { byUser, counts };
}

module.exports = {
  toDateStr,
  todayStr,
  daysAgoStr,
  weekStartStr,
  recordSolved,
  getRecentActivity,
  getActiveDates,
  countActiveDays,
  getWeeklyProgress,
  calculateStreaks,
  getWeekActivityForUsers,
};
