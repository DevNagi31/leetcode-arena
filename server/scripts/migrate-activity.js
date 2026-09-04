#!/usr/bin/env node
/**
 * One-time migration: move User.activityDates into the `activities` collection.
 *
 *   node server/scripts/migrate-activity.js --dry-run   # report only
 *   node server/scripts/migrate-activity.js             # migrate
 *
 * Safe to re-run. Rows are upserted on (userId, date), and the embedded array
 * is only unset once its rows are confirmed written, so an interrupted run can
 * simply be run again.
 */
require('dotenv').config({ path: require('path').resolve(__dirname, '..', '.env') });
const mongoose = require('mongoose');

const DRY_RUN = process.argv.includes('--dry-run');
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/leetcode-arena';

async function main() {
  await mongoose.connect(MONGODB_URI);
  console.log(`Connected${DRY_RUN ? ' (dry run — nothing will be written)' : ''}`);

  const db = mongoose.connection.db;
  // Read through the raw driver: activityDates is gone from the Mongoose
  // schema, so a model query would not return it.
  const users = db.collection('users');
  const activities = db.collection('activities');

  const cursor = users.find(
    { activityDates: { $exists: true, $ne: [] } },
    { projection: { activityDates: 1 } }
  );

  let usersSeen = 0;
  let rowsWritten = 0;
  let usersCleared = 0;

  while (await cursor.hasNext()) {
    const user = await cursor.next();
    usersSeen++;

    // Collapse duplicate days defensively — the old array had no uniqueness
    // guarantee, so the same date could appear more than once.
    const byDate = new Map();
    for (const a of user.activityDates) {
      if (!a || typeof a.date !== 'string') continue;
      const existing = byDate.get(a.date);
      if (existing) {
        existing.problemsSolved += a.problemsSolved || 0;
        existing.easy = a.easy ?? existing.easy;
        existing.medium = a.medium ?? existing.medium;
        existing.hard = a.hard ?? existing.hard;
      } else {
        byDate.set(a.date, {
          problemsSolved: a.problemsSolved || 0,
          easy: a.easy || 0,
          medium: a.medium || 0,
          hard: a.hard || 0,
        });
      }
    }

    if (byDate.size === 0) continue;

    const ops = [...byDate.entries()].map(([date, v]) => ({
      updateOne: {
        filter: { userId: user._id, date },
        update: { $set: { userId: user._id, date, ...v } },
        upsert: true,
      },
    }));

    if (DRY_RUN) {
      rowsWritten += ops.length;
      console.log(`  ${user._id}: would write ${ops.length} day(s)`);
      continue;
    }

    await activities.bulkWrite(ops, { ordered: false });
    rowsWritten += ops.length;

    // Only drop the embedded array once its rows are safely in place.
    const written = await activities.countDocuments({ userId: user._id });
    if (written >= byDate.size) {
      await users.updateOne({ _id: user._id }, { $unset: { activityDates: '' } });
      usersCleared++;
    } else {
      console.warn(`  ${user._id}: expected ${byDate.size} rows, found ${written} — leaving activityDates in place`);
    }
  }

  if (!DRY_RUN) {
    // Matches ActivitySchema.index({ userId: 1, date: 1 }, { unique: true }).
    await activities.createIndex({ userId: 1, date: 1 }, { unique: true });
  }

  console.log(
    `\nUsers with embedded activity: ${usersSeen}` +
    `\nActivity rows ${DRY_RUN ? 'to write' : 'written'}: ${rowsWritten}` +
    `\nUsers cleared: ${usersCleared}`
  );
}

main()
  .catch((err) => {
    console.error('Migration failed:', err);
    process.exitCode = 1;
  })
  .finally(() => mongoose.connection.close());
