const TIERS = [
  { name: 'Iron', min: 0, max: 499 },
  { name: 'Bronze', min: 500, max: 1499 },
  { name: 'Silver', min: 1500, max: 2999 },
  { name: 'Gold', min: 3000, max: 4999 },
  { name: 'Platinum', min: 5000, max: 7999 },
  { name: 'Diamond', min: 8000, max: 11999 },
  { name: 'Master', min: 12000, max: Infinity },
];

export function calculateTier(score) {
  const s = score || 0;
  for (let i = 0; i < TIERS.length; i++) {
    const t = TIERS[i];
    if (s >= t.min && s <= t.max) {
      const range = t.max === Infinity ? 1 : t.max - t.min + 1;
      const posInTier = s - t.min;
      const progress = t.max === Infinity ? 1 : posInTier / range;

      let division = null;
      if (t.max !== Infinity) {
        const third = range / 3;
        if (posInTier < third) division = 'III';
        else if (posInTier < third * 2) division = 'II';
        else division = 'I';
      }

      return {
        name: t.name,
        division,
        score: s,
        nextTierAt: t.max === Infinity ? null : TIERS[i + 1]?.min || null,
        progress,
      };
    }
  }
  return { name: 'Iron', division: 'III', score: s, nextTierAt: 500, progress: 0 };
}

export { TIERS };
