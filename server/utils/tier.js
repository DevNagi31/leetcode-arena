/**
 * Calculate rank tier based on score.
 *
 * Tiers (each except Master has divisions III, II, I splitting the range into thirds):
 *   Iron:     0 - 499
 *   Bronze:   500 - 1499
 *   Silver:   1500 - 2999
 *   Gold:     3000 - 4999
 *   Platinum: 5000 - 7999
 *   Diamond:  8000 - 11999
 *   Master:   12000+
 */

const TIERS = [
  { name: 'Iron',     min: 0,     max: 499 },
  { name: 'Bronze',   min: 500,   max: 1499 },
  { name: 'Silver',   min: 1500,  max: 2999 },
  { name: 'Gold',     min: 3000,  max: 4999 },
  { name: 'Platinum', min: 5000,  max: 7999 },
  { name: 'Diamond',  min: 8000,  max: 11999 },
  { name: 'Master',   min: 12000, max: Infinity }
];

const DIVISIONS = ['III', 'II', 'I'];

function calculateTier(score) {
  const s = Math.max(0, Math.floor(score || 0));

  // Find the tier
  const tier = TIERS.find(t => s >= t.min && s <= t.max) || TIERS[TIERS.length - 1];
  const tierIndex = TIERS.indexOf(tier);

  // Next tier threshold (null for Master)
  const nextTierAt = tier.name === 'Master' ? null : TIERS[tierIndex + 1].min;

  // Overall progress through the tier (0-1)
  let progress;
  if (tier.name === 'Master') {
    progress = 1;
  } else {
    const range = tier.max - tier.min + 1;
    progress = (s - tier.min) / range;
  }

  // Division (split tier range into thirds)
  let division = null;
  if (tier.name !== 'Master') {
    const range = tier.max - tier.min + 1;
    const divisionSize = range / 3;
    const divIndex = Math.min(2, Math.floor((s - tier.min) / divisionSize));
    division = DIVISIONS[divIndex];
  }

  return {
    name: tier.name,
    division,
    score: s,
    nextTierAt,
    progress: Math.round(progress * 1000) / 1000 // 3 decimal places
  };
}

module.exports = { calculateTier };
