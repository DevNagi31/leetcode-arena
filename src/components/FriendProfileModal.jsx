import React from 'react';
import {
  Trophy, User, Globe, Building2, Calendar, Flame,
  MessageCircle, X as XIcon
} from 'lucide-react';

export default function FriendProfileModal({ friend, onClose, onMessage, onRemove }) {
  const today = new Date();
  const startOfWeek = new Date();
  startOfWeek.setDate(today.getDate() - today.getDay());
  const daysOfWeek = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

  const thisWeekActivity = daysOfWeek.map((day, index) => {
    const date = new Date(startOfWeek);
    date.setDate(startOfWeek.getDate() + index);
    const dateStr = `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
    const activity = (friend.activityDates || []).find(a => a.date === dateStr);
    return { day, solved: activity?.problemsSolved || 0, active: !!activity };
  });

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content modal-large" onClick={(e) => e.stopPropagation()}>
        <div className="profile-modal-header">
          <div className="friend-avatar-large"><User size={40} /></div>
          <div style={{ flex: 1 }}>
            <h2>{friend.username}</h2>
            <p style={{ color: 'var(--text-tertiary)', fontSize: '13px', marginTop: '4px' }}>
              <Globe size={12} style={{ display: 'inline', marginRight: '4px' }} />
              {friend.country} • {friend.institutionName}
            </p>
            <p style={{ color: 'var(--text-tertiary)', fontSize: '12px', marginTop: '2px' }}>
              LeetCode: {friend.leetcodeUsername}
            </p>
          </div>
          <button className="chat-close-btn" onClick={onClose}><XIcon size={20} /></button>
        </div>

        <div className="stats-grid" style={{ marginTop: '24px' }}>
          <div className="stat-card">
            <div className="stat-value">{friend.problems || 0}</div>
            <div className="stat-label">TOTAL SOLVED</div>
          </div>
          <div className="stat-card">
            <div className="stat-value" style={{ color: '#4CAF50' }}>{friend.easy || 0}</div>
            <div className="stat-label">EASY</div>
          </div>
          <div className="stat-card">
            <div className="stat-value" style={{ color: '#FF9800' }}>{friend.medium || 0}</div>
            <div className="stat-label">MEDIUM</div>
          </div>
          <div className="stat-card">
            <div className="stat-value" style={{ color: '#F44336' }}>{friend.hard || 0}</div>
            <div className="stat-label">HARD</div>
          </div>
        </div>

        <div className="section-card" style={{ marginTop: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-around', textAlign: 'center' }}>
            <div>
              <div style={{ fontSize: '24px', fontWeight: '700', color: '#FF6B35' }}>
                <Flame size={24} style={{ display: 'inline' }} /> {friend.currentStreak || 0}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '4px' }}>Current Streak</div>
            </div>
            <div>
              <div style={{ fontSize: '24px', fontWeight: '700', color: 'var(--text-primary)' }}>{friend.longestStreak || 0}</div>
              <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '4px' }}>Longest Streak</div>
            </div>
            <div>
              <div style={{ fontSize: '24px', fontWeight: '700', color: 'var(--text-primary)' }}>{friend.activeDaysCount ?? 0}</div>
              <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '4px' }}>Active Days</div>
            </div>
          </div>
        </div>

        <div className="section-card" style={{ marginTop: '20px' }}>
          <h3 className="section-title"><Calendar size={18} /> This Week</h3>
          <div className="week-grid">
            {thisWeekActivity.map(({ day, solved, active }) => (
              <div key={day} className={`week-day ${active ? 'active' : ''}`}>
                <div className="week-day-name">{day}</div>
                <div className="week-day-circle">{active ? '✓' : ''}</div>
                <div className="week-day-count">{solved > 0 ? solved : '-'}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="section-card" style={{ marginTop: '20px' }}>
          <h3 className="section-title"><Trophy size={18} /> Rankings</h3>
          <div className="rankings-grid">
            <div className="ranking-item">
              <Globe size={16} />
              <span>Global</span>
              <strong>#{friend.rank || '-'}</strong>
            </div>
            <div className="ranking-item">
              <Globe size={16} />
              <span>{friend.country}</span>
              <strong>{friend.countryRank ? `#${friend.countryRank}` : '-'}</strong>
            </div>
            <div className="ranking-item">
              <Building2 size={16} />
              <span>University</span>
              <strong>{friend.universityRank ? `#${friend.universityRank}` : '-'}</strong>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
          <button className="pixel-button primary full-width" onClick={() => onMessage(friend)}>
            <MessageCircle size={16} /> MESSAGE
          </button>
          <button className="pixel-button full-width" onClick={() => onRemove(friend._id)}>REMOVE FRIEND</button>
        </div>
      </div>
    </div>
  );
}
