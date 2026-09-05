import React, { useState, useEffect, useRef } from 'react';
import {
  Trophy, LogOut, Edit, Lock, Menu, Moon, Sun,
  BarChart3, Globe, Building2, Code, Users,
  Activity, HelpCircle
} from 'lucide-react';
import ProfileEdit from './ProfileEdit';
import PasswordChange from './PasswordChange';
import FriendsTab from './FriendsTab';
import MySolutionsTab from './MySolutionsTab';
import Leaderboard from './Leaderboard';
import LoadingScreen from './LoadingScreen';
import RankBadge from './RankBadge';
import AnalyticsTab from './AnalyticsTab';
import Tour from './Tour';
import { authPost, authPut } from '../utils/api';
import { calculateTier } from '../utils/tiers';

// Shown once per browser on first visit to the dashboard, and replayable from
// the menu. Selectors point at data-tour attributes on the tab buttons.
const TOUR_STEPS = [
  {
    selector: '[data-tour="overview"]',
    title: 'Your stats at a glance',
    body: 'Total solved, the easy/medium/hard split, and where you rank globally, in your country, and at your school.',
  },
  {
    selector: '[data-tour="analytics"]',
    title: 'Streaks and consistency',
    body: 'An activity heatmap, current and longest streaks, and a weekly goal you can set for yourself.',
  },
  {
    selector: '[data-tour="solutions"]',
    title: 'Save your solutions',
    body: 'Paste a LeetCode link to pull in the problem, then keep your code and notes beside it. Recent submissions are listed for you.',
  },
  {
    selector: '[data-tour="friends"]',
    title: 'Add friends',
    body: 'Search by username, compare stats, and message each other in real time.',
  },
  {
    selector: '[data-tour="leaderboard"]',
    title: 'Compete',
    body: 'Rankings globally, by country, by university, or just among your friends.',
  },
];

const TOUR_KEY = 'tourSeen';

export default function Dashboard({ user, setUser, onNavigate, onLogout, showToast, dark, setDark }) {
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [menuOpen, setMenuOpen] = useState(false);
  const [leaderboardUsers, setLeaderboardUsers] = useState([]);
  const [editingGoal, setEditingGoal] = useState(false);
  const [weeklyGoalTarget, setWeeklyGoalTarget] = useState(user?.weeklyGoal?.target || 5);
  const menuRef = useRef(null);
  const [showTour, setShowTour] = useState(() => {
    try { return !localStorage.getItem(TOUR_KEY); } catch { return false; }
  });

  const endTour = (reason) => {
    setShowTour(false);
    // A tour that ended because it had nothing to point at was never actually
    // seen — leave the flag unset so it gets another chance next visit.
    if (reason === 'unavailable') return;
    try { localStorage.setItem(TOUR_KEY, '1'); } catch { /* private mode */ }
  };

  useEffect(() => {
    const autoRefresh = async () => {
      try {
        const response = await authPost('/users/refresh-stats');
        setUser(response.data.user);
      } catch (error) { /* silently fail - stats shown from cache */ }
    };
    autoRefresh();
  }, [setUser]);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    if (menuOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [menuOpen]);

  if (!user) return <LoadingScreen />;

  const handleSaveProfile = async (data) => {
    const response = await authPut('/users/profile', data);
    setUser(response.data.user);
    setShowEditProfile(false);
  };

  const handleChangePassword = async (data) => {
    await authPut('/users/change-password', data);
  };

  const handleSaveGoal = async () => {
    try {
      await authPut('/users/weekly-goal', { target: weeklyGoalTarget });
      setUser({ ...user, weeklyGoal: { ...user.weeklyGoal, target: weeklyGoalTarget } });
      setEditingGoal(false);
      showToast('Weekly goal updated!', 'success');
    } catch (error) { showToast('Failed to update goal', 'error'); }
  };

  return (
    <div className="dashboard">
      <div className="floating-menu" ref={menuRef}>
        <button className="floating-menu-btn" onClick={() => setMenuOpen(!menuOpen)} aria-label="Menu">
          <Menu size={18} />
        </button>
        {menuOpen && (
          <div className="dropdown-menu">
            <button onClick={() => { setShowEditProfile(true); setMenuOpen(false); }}><Edit size={14} /> Edit Profile</button>
            <button onClick={() => { setShowChangePassword(true); setMenuOpen(false); }}><Lock size={14} /> Change Password</button>
            <button onClick={() => { setDark(!dark); }}>
              {dark ? <Sun size={14} /> : <Moon size={14} />} {dark ? 'Light Mode' : 'Dark Mode'}
            </button>
            <button onClick={() => { setMenuOpen(false); setShowTour(true); }}><HelpCircle size={14} /> Show Walkthrough</button>
            <div className="dropdown-divider" />
            <button className="dropdown-danger" onClick={() => { setMenuOpen(false); onLogout(); }}><LogOut size={14} /> Logout</button>
          </div>
        )}
      </div>

      <header className="dashboard-header">
        <div className="user-info">
          <RankBadge tier={user.tier || calculateTier(user.score)} size="large" showProgress />
          <div>
            {/* Every signed-in view previously had no h1 at all, so screen
                readers had nothing to anchor the page on. */}
            <h1>{user.username}</h1>
            <p><Globe size={12} />{user.country}</p>
            <p><Building2 size={12} />{user.institutionName} • {user.year}</p>
            <p style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>LeetCode: {user.leetcodeUsername}</p>
          </div>
        </div>
      </header>

      <nav className="dashboard-tabs" aria-label="Dashboard sections">
        <button data-tour="overview" className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')}><BarChart3 size={16} /> Overview</button>
        <button data-tour="analytics" className={`tab-btn ${activeTab === 'analytics' ? 'active' : ''}`} onClick={() => setActiveTab('analytics')}><Activity size={16} /> Analytics</button>
        <button data-tour="solutions" className={`tab-btn ${activeTab === 'solutions' ? 'active' : ''}`} onClick={() => setActiveTab('solutions')}><Code size={16} /> My Solutions</button>
        <button data-tour="friends" className={`tab-btn ${activeTab === 'friends' ? 'active' : ''}`} onClick={() => setActiveTab('friends')}><Users size={16} /> Friends</button>
        <button data-tour="leaderboard" className={`tab-btn ${activeTab === 'leaderboard' ? 'active' : ''}`} onClick={() => setActiveTab('leaderboard')}><Trophy size={16} /> Leaderboard</button>
      </nav>

      {activeTab === 'overview' && (
        <>
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-icon"><BarChart3 size={28} strokeWidth={2} /></div>
              <div className="stat-value">{user.problems || 0}</div>
              <div className="stat-label">TOTAL SOLVED</div>
            </div>
            <div className="stat-card">
              <div className="stat-value" style={{ color: 'var(--diff-easy)' }}>{user.easy || 0}</div>
              <div className="stat-label">EASY</div>
            </div>
            <div className="stat-card">
              <div className="stat-value" style={{ color: 'var(--diff-medium)' }}>{user.medium || 0}</div>
              <div className="stat-label">MEDIUM</div>
            </div>
            <div className="stat-card">
              <div className="stat-value" style={{ color: 'var(--diff-hard)' }}>{user.hard || 0}</div>
              <div className="stat-label">HARD</div>
            </div>
          </div>

          <div className="section-card">
            <h2 className="section-title"><Trophy size={18} /> Your Rankings</h2>
            <div className="rankings-grid">
              <div className="ranking-item"><Globe size={16} /><span>Global</span><strong>#{user.rank || '-'}</strong></div>
              <div className="ranking-item"><Globe size={16} /><span>{user.country}</span><strong>{user.countryRank ? `#${user.countryRank}` : '-'}</strong></div>
              <div className="ranking-item"><Building2 size={16} /><span>{user.institutionName?.split(' ').slice(0,2).join(' ')}</span><strong>{user.universityRank ? `#${user.universityRank}` : '-'}</strong></div>
            </div>
            <button className="pixel-button primary full-width" style={{ marginTop: '16px' }} onClick={() => setActiveTab('leaderboard')}>
              <Trophy size={14} /> VIEW FULL LEADERBOARD
            </button>
          </div>
        </>
      )}

      {activeTab === 'analytics' && (
        <AnalyticsTab
          user={user}
          weeklyGoal={user.weeklyGoal}
          editingGoal={editingGoal}
          weeklyGoalTarget={weeklyGoalTarget}
          onToggleEditGoal={() => setEditingGoal(!editingGoal)}
          onGoalTargetChange={setWeeklyGoalTarget}
          onSaveGoal={handleSaveGoal}
        />
      )}
      {activeTab === 'solutions' && <MySolutionsTab showToast={showToast} user={user} />}
      {activeTab === 'friends' && <FriendsTab currentUser={user} showToast={showToast} />}
      {activeTab === 'leaderboard' && (
        <Leaderboard
          users={leaderboardUsers}
          setUsers={setLeaderboardUsers}
          onNavigate={onNavigate}
          currentUser={user}
          showToast={showToast}
          embedded
        />
      )}

      {showTour && <Tour steps={TOUR_STEPS} onClose={endTour} />}

      {showEditProfile && <ProfileEdit user={user} onSave={handleSaveProfile} onCancel={() => setShowEditProfile(false)} showToast={showToast} />}
      {showChangePassword && <PasswordChange onSave={handleChangePassword} onCancel={() => setShowChangePassword(false)} showToast={showToast} />}
    </div>
  );
}
