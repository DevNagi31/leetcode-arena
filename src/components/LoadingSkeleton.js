import React from 'react';

const Skeleton = ({ width = '100%', height = '20px', borderRadius = '6px', style = {} }) => (
  <div className="skeleton" style={{ width, height, borderRadius, ...style }} />
);

export const StatsSkeleton = () => (
  <div className="stats-grid">
    {[1, 2, 3, 4].map(i => (
      <div key={i} className="stat-card">
        <Skeleton width="60px" height="32px" style={{ margin: '0 auto 8px' }} />
        <Skeleton width="80px" height="12px" style={{ margin: '0 auto' }} />
      </div>
    ))}
  </div>
);

export const CardSkeleton = ({ lines = 3 }) => (
  <div className="section-card">
    <Skeleton width="150px" height="20px" style={{ marginBottom: '16px' }} />
    {Array(lines).fill(0).map((_, i) => (
      <Skeleton key={i} width={`${90 - i * 15}%`} height="14px" style={{ marginBottom: '10px' }} />
    ))}
  </div>
);

export const FriendCardSkeleton = () => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
    {[1, 2, 3].map(i => (
      <div key={i} className="friend-card" style={{ padding: '16px' }}>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <Skeleton width="40px" height="40px" borderRadius="50%" />
          <div style={{ flex: 1 }}>
            <Skeleton width="120px" height="16px" style={{ marginBottom: '6px' }} />
            <Skeleton width="200px" height="12px" />
          </div>
        </div>
      </div>
    ))}
  </div>
);

export const LeaderboardSkeleton = () => (
  <div>
    <div className="podium" style={{ opacity: 0.5 }}>
      {[1, 2, 3].map(i => (
        <div key={i} className={`podium-place place-${i}`}>
          <Skeleton width="40px" height="40px" borderRadius="50%" style={{ margin: '0 auto 8px' }} />
          <Skeleton width="80px" height="14px" style={{ margin: '0 auto 4px' }} />
          <Skeleton width="50px" height="12px" style={{ margin: '0 auto' }} />
        </div>
      ))}
    </div>
    {[1, 2, 3, 4, 5].map(i => (
      <div key={i} style={{ display: 'flex', gap: '12px', padding: '12px 16px', alignItems: 'center' }}>
        <Skeleton width="30px" height="16px" />
        <Skeleton width="32px" height="32px" borderRadius="50%" />
        <Skeleton width="120px" height="14px" style={{ flex: 1 }} />
        <Skeleton width="50px" height="14px" />
      </div>
    ))}
  </div>
);

export default Skeleton;
