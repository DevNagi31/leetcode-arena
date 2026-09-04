import React from 'react';

const TIER_CONFIG = {
  Iron:     { colors: ['#8a8a8a', '#6b6b6b', '#4a4a4a'], accent: '#999' },
  Bronze:   { colors: ['#cd7f32', '#a0622e', '#7a4a22'], accent: '#e8a04c' },
  Silver:   { colors: ['#c0c0c0', '#9a9a9a', '#787878'], accent: '#dcdcdc' },
  Gold:     { colors: ['#ffd700', '#d4a800', '#aa8500'], accent: '#ffe44d' },
  Platinum: { colors: ['#00c9a7', '#00a088', '#007a68'], accent: '#4de8cc' },
  Diamond:  { colors: ['#b9f2ff', '#7ecef0', '#4fa8d4'], accent: '#e0f7ff' },
  Master:   { colors: ['#ff4655', '#d4364a', '#a8283a'], accent: '#ff7a85' },
};

function TierIcon({ tier, size = 48 }) {
  const config = TIER_CONFIG[tier] || TIER_CONFIG.Iron;
  const [c1, c2, c3] = config.colors;
  const s = size;
  const cx = s / 2;

  return (
    <svg width={s} height={s} viewBox={`0 0 ${s} ${s}`} fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id={`tierGrad-${tier}`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={c1} />
          <stop offset="50%" stopColor={c2} />
          <stop offset="100%" stopColor={c3} />
        </linearGradient>
        <linearGradient id={`tierShine-${tier}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={config.accent} stopOpacity="0.6" />
          <stop offset="50%" stopColor={config.accent} stopOpacity="0" />
          <stop offset="100%" stopColor={config.accent} stopOpacity="0.3" />
        </linearGradient>
        <filter id={`tierGlow-${tier}`}>
          <feGaussianBlur stdDeviation="1.5" result="blur" />
          <feFlood floodColor={c1} floodOpacity="0.4" />
          <feComposite in2="blur" operator="in" />
          <feMerge>
            <feMergeNode />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Outer shield shape */}
      <path
        d={`M${cx} ${s * 0.04} L${s * 0.92} ${s * 0.22} L${s * 0.92} ${s * 0.52} C${s * 0.92} ${s * 0.72} ${s * 0.72} ${s * 0.88} ${cx} ${s * 0.96} C${s * 0.28} ${s * 0.88} ${s * 0.08} ${s * 0.72} ${s * 0.08} ${s * 0.52} L${s * 0.08} ${s * 0.22} Z`}
        fill={`url(#tierGrad-${tier})`}
        stroke={c3}
        strokeWidth="1"
        filter={tier === 'Master' || tier === 'Diamond' ? `url(#tierGlow-${tier})` : undefined}
      />

      {/* Inner shield highlight */}
      <path
        d={`M${cx} ${s * 0.12} L${s * 0.84} ${s * 0.27} L${s * 0.84} ${s * 0.50} C${s * 0.84} ${s * 0.67} ${s * 0.67} ${s * 0.80} ${cx} ${s * 0.87} C${s * 0.33} ${s * 0.80} ${s * 0.16} ${s * 0.67} ${s * 0.16} ${s * 0.50} L${s * 0.16} ${s * 0.27} Z`}
        fill={`url(#tierShine-${tier})`}
      />

      {/* Center chevron / emblem */}
      {tier === 'Iron' && (
        <path d={`M${cx} ${s*0.30} L${s*0.62} ${s*0.50} L${cx} ${s*0.70} L${s*0.38} ${s*0.50} Z`}
          fill={c3} stroke={config.accent} strokeWidth="0.8" />
      )}
      {tier === 'Bronze' && (
        <>
          <path d={`M${cx} ${s*0.28} L${s*0.65} ${s*0.48} L${cx} ${s*0.68} L${s*0.35} ${s*0.48} Z`}
            fill={c3} stroke={config.accent} strokeWidth="0.8" />
          <circle cx={cx} cy={s*0.48} r={s*0.06} fill={config.accent} opacity="0.8" />
        </>
      )}
      {tier === 'Silver' && (
        <>
          <path d={`M${cx} ${s*0.26} L${s*0.68} ${s*0.46} L${cx} ${s*0.72} L${s*0.32} ${s*0.46} Z`}
            fill={c3} stroke={config.accent} strokeWidth="1" />
          <path d={`M${cx} ${s*0.34} L${s*0.58} ${s*0.46} L${cx} ${s*0.58} L${s*0.42} ${s*0.46} Z`}
            fill={config.accent} opacity="0.5" />
        </>
      )}
      {tier === 'Gold' && (
        <>
          <path d={`M${cx} ${s*0.24} L${s*0.70} ${s*0.46} L${cx} ${s*0.74} L${s*0.30} ${s*0.46} Z`}
            fill={c3} stroke={config.accent} strokeWidth="1" />
          <path d={`M${cx} ${s*0.35} L${s*0.58} ${s*0.46} L${cx} ${s*0.57} L${s*0.42} ${s*0.46} Z`}
            fill={config.accent} opacity="0.7" />
          {/* Star */}
          <polygon points={`${cx},${s*0.38} ${cx+s*0.04},${s*0.44} ${cx+s*0.08},${s*0.44} ${cx+s*0.05},${s*0.48} ${cx+s*0.06},${s*0.53} ${cx},${s*0.50} ${cx-s*0.06},${s*0.53} ${cx-s*0.05},${s*0.48} ${cx-s*0.08},${s*0.44} ${cx-s*0.04},${s*0.44}`}
            fill={config.accent} opacity="0.9" />
        </>
      )}
      {tier === 'Platinum' && (
        <>
          <path d={`M${cx} ${s*0.22} L${s*0.72} ${s*0.44} L${cx} ${s*0.76} L${s*0.28} ${s*0.44} Z`}
            fill={c3} stroke={config.accent} strokeWidth="1.2" />
          {/* Double chevron */}
          <path d={`M${cx} ${s*0.32} L${s*0.60} ${s*0.44} L${cx} ${s*0.56}`}
            fill="none" stroke={config.accent} strokeWidth="2" strokeLinecap="round" />
          <path d={`M${cx} ${s*0.40} L${s*0.56} ${s*0.48} L${cx} ${s*0.56}`}
            fill="none" stroke={config.accent} strokeWidth="1.5" strokeLinecap="round" opacity="0.7" />
        </>
      )}
      {tier === 'Diamond' && (
        <>
          <path d={`M${cx} ${s*0.22} L${s*0.72} ${s*0.44} L${cx} ${s*0.76} L${s*0.28} ${s*0.44} Z`}
            fill={c3} stroke={config.accent} strokeWidth="1.5" />
          {/* Diamond gem shape */}
          <path d={`M${cx} ${s*0.30} L${s*0.60} ${s*0.40} L${s*0.56} ${s*0.46} L${cx} ${s*0.60} L${s*0.44} ${s*0.46} L${s*0.40} ${s*0.40} Z`}
            fill={config.accent} opacity="0.8" />
          <path d={`M${cx} ${s*0.30} L${cx} ${s*0.60}`} stroke={c2} strokeWidth="0.5" opacity="0.5" />
          <path d={`M${s*0.40} ${s*0.40} L${s*0.60} ${s*0.40}`} stroke={c2} strokeWidth="0.5" opacity="0.5" />
        </>
      )}
      {tier === 'Master' && (
        <>
          <path d={`M${cx} ${s*0.20} L${s*0.74} ${s*0.44} L${cx} ${s*0.78} L${s*0.26} ${s*0.44} Z`}
            fill={c3} stroke={config.accent} strokeWidth="1.5" />
          {/* Crown */}
          <path d={`M${s*0.34} ${s*0.50} L${s*0.38} ${s*0.36} L${cx} ${s*0.44} L${s*0.62} ${s*0.36} L${s*0.66} ${s*0.50} Z`}
            fill={config.accent} opacity="0.9" />
          <circle cx={s*0.38} cy={s*0.35} r={s*0.025} fill={config.accent} />
          <circle cx={cx} cy={s*0.42} r={s*0.025} fill={config.accent} />
          <circle cx={s*0.62} cy={s*0.35} r={s*0.025} fill={config.accent} />
        </>
      )}
    </svg>
  );
}

function DivisionDots({ division }) {
  const count = division === 'I' ? 3 : division === 'II' ? 2 : 1;
  return (
    <div style={{ display: 'flex', gap: '3px', justifyContent: 'center', marginTop: '2px' }}>
      {[1, 2, 3].map(i => (
        <div key={i} style={{
          width: '5px', height: '5px', borderRadius: '50%',
          background: i <= count ? 'var(--text-primary)' : 'var(--border)',
          transition: 'background 0.3s'
        }} />
      ))}
    </div>
  );
}

export default function RankBadge({ tier, size = 'medium', showLabel = true, showProgress = false }) {
  if (!tier) return null;

  const sizes = { small: 32, medium: 48, large: 72 };
  const iconSize = sizes[size] || sizes.medium;

  return (
    <div className="rank-badge-container" style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
      <TierIcon tier={tier.name} size={iconSize} />
      {showLabel && (
        <div style={{ textAlign: 'center' }}>
          <div style={{
            fontSize: size === 'large' ? '14px' : size === 'small' ? '9px' : '11px',
            fontWeight: 700,
            color: TIER_CONFIG[tier.name]?.colors[0] || 'var(--text-primary)',
            letterSpacing: '0.5px',
            textTransform: 'uppercase',
          }}>
            {tier.name} {tier.division}
          </div>
          {tier.division && <DivisionDots division={tier.division} />}
        </div>
      )}
      {showProgress && tier.nextTierAt && (
        <div style={{ width: '100%', maxWidth: iconSize * 2, marginTop: '4px' }}>
          <div style={{
            height: '4px', background: 'var(--border)', borderRadius: '2px', overflow: 'hidden'
          }}>
            <div style={{
              height: '100%',
              width: `${Math.round((tier.progress || 0) * 100)}%`,
              background: TIER_CONFIG[tier.name]?.colors[0] || 'var(--text-primary)',
              borderRadius: '2px',
              transition: 'width 0.5s ease'
            }} />
          </div>
          <div style={{
            fontSize: '9px', color: 'var(--text-tertiary)', textAlign: 'center', marginTop: '2px'
          }}>
            {tier.score} / {tier.nextTierAt}
          </div>
        </div>
      )}
    </div>
  );
}

export { TierIcon, TIER_CONFIG };
