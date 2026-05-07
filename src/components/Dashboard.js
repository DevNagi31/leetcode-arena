import React, { useState, useEffect, useRef } from 'react';
import {
  Trophy, LogOut, Edit, Lock, Menu, Moon, Sun,
  BarChart3, Globe, Building2, Code, Users,
  Activity
} from 'lucide-react';
import ProfileEdit from './ProfileEdit';
import PasswordChange from './PasswordChange';
import FriendsTab from './FriendsTab';
import MySolutionsTab from './MySolutionsTab';
import Leaderboard from './Leaderboard';
import LoadingScreen from './LoadingScreen';
import RankBadge from './RankBadge';
import AnalyticsTab from './AnalyticsTab';
import { authPost, authPut } from '../utils/api';
import { calculateTier } from '../utils/tiers';

export default function Dashboard({ user, setUser, onNavigate, onLogout, showToast, dark, setDark }) {
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [menuOpen, setMenuOpen] = useState(false);
  const [leaderboardUsers, setLeaderboardUsers] = useState([]);
  const [editingGoal, setEditingGoal] = useState(false);
  const [weeklyGoalTarget, setWeeklyGoalTarget] = useState(user?.weeklyGoal?.target || 5);
  const menuRef = useRef(null);

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
            <div className="dropdown-divider" />
            <button className="dropdown-danger" onClick={() => { setMenuOpen(false); onLogout(); }}><LogOut size={14} /> Logout</button>
          </div>
        )}
      </div>

      <div className="dashboard-header">
        <div className="user-info">
          <RankBadge tier={user.tier || calculateTier(user.score)} size="large" showProgress />
          <div>
            <h2>{user.username}</h2>
            <p><Globe size={12} />{user.country}</p>
            <p><Building2 size={12} />{user.institutionName} • {user.year}</p>
            <p style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>LeetCode: {user.leetcodeUsername}</p>
          </div>
        </div>
      </div>

      <div className="dashboard-tabs">
        <button className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')}><BarChart3 size={16} /> Overview</button>
        <button className={`tab-btn ${activeTab === 'analytics' ? 'active' : ''}`} onClick={() => setActiveTab('analytics')}><Activity size={16} /> Analytics</button>
        <button className={`tab-btn ${activeTab === 'solutions' ? 'active' : ''}`} onClick={() => setActiveTab('solutions')}><Code size={16} /> My Solutions</button>
        <button className={`tab-btn ${activeTab === 'friends' ? 'active' : ''}`} onClick={() => setActiveTab('friends')}><Users size={16} /> Friends</button>
        <button className={`tab-btn ${activeTab === 'leaderboard' ? 'active' : ''}`} onClick={() => setActiveTab('leaderboard')}><Trophy size={16} /> Leaderboard</button>
      </div>

      {activeTab === 'overview' && (
        <>
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-icon"><BarChart3 size={28} strokeWidth={2} /></div>
              <div className="stat-value">{user.problems || 0}</div>
              <div className="stat-label">TOTAL SOLVED</div>
            </div>
            <div className="stat-card">
              <div className="stat-value" style={{ color: '#22c55e' }}>{user.easy || 0}</div>
              <div className="stat-label">EASY</div>
            </div>
            <div className="stat-card">
              <div className="stat-value" style={{ color: '#eab308' }}>{user.medium || 0}</div>
              <div className="stat-label">MEDIUM</div>
            </div>
            <div className="stat-card">
              <div className="stat-value" style={{ color: '#ef4444' }}>{user.hard || 0}</div>
              <div className="stat-label">HARD</div>
            </div>
          </div>

          <div className="section-card">
            <h3 className="section-title"><Trophy size={18} /> Your Rankings</h3>
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

      {showEditProfile && <ProfileEdit user={user} onSave={handleSaveProfile} onCancel={() => setShowEditProfile(false)} showToast={showToast} />}
      {showChangePassword && <PasswordChange onSave={handleChangePassword} onCancel={() => setShowChangePassword(false)} showToast={showToast} />}
    </div>
  );
}
