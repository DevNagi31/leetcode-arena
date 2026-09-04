const Activity = require('../models/Activity');
const { calculateStreaks } = require('../utils/activity');

describe('Activity model', () => {
  test('has the expected fields', () => {
    const schema = Activity.schema.obj;
    expect(schema.userId).toBeDefined();
    expect(schema.date).toBeDefined();
    expect(schema.problemsSolved).toBeDefined();
    expect(schema.easy).toBeDefined();
    expect(schema.medium).toBeDefined();
    expect(schema.hard).toBeDefined();
  });

  test('is unique per user per day', () => {
    const idx = Activity.schema.indexes()
      .find(([fields]) => fields.userId === 1 && fields.date === 1);
    expect(idx).toBeDefined();
    expect(idx[1].unique).toBe(true);
  });

  test('rejects a malformed date', () => {
    const bad = new Activity({ userId: '507f1f77bcf86cd799439011', date: '04-09-2026' });
    expect(bad.validateSync().errors.date).toBeDefined();
  });
});

describe('calculateStreaks', () => {
  const iso = (offsetDays) =>
    new Date(Date.now() - offsetDays * 86400000).toISOString().split('T')[0];

  test('returns zeroes for no activity', () => {
    expect(calculateStreaks([])).toEqual({ currentStreak: 0, longestStreak: 0 });
  });

  test('finds the longest run in a gapped history', () => {
    const { longestStreak } = calculateStreaks([
      '2026-01-01', '2026-01-02', '2026-01-03', '2026-01-05', '2026-01-06',
    ]);
    expect(longestStreak).toBe(3);
  });

  test('counts a run ending today as current', () => {
    const { currentStreak } = calculateStreaks([iso(2), iso(1), iso(0)]);
    expect(currentStreak).toBe(3);
  });

  test('forgives a single missed day', () => {
    const { currentStreak } = calculateStreaks([iso(2), iso(1)]);
    expect(currentStreak).toBe(2);
  });

  test('drops the current streak once two days are missed', () => {
    const { currentStreak } = calculateStreaks([iso(5), iso(4), iso(3)]);
    expect(currentStreak).toBe(0);
  });

  test('an old history still reports its longest run', () => {
    const { currentStreak, longestStreak } = calculateStreaks([iso(9), iso(8), iso(7)]);
    expect(currentStreak).toBe(0);
    expect(longestStreak).toBe(3);
  });
});
