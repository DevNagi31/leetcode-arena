import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import io from 'socket.io-client';
import DOMPurify from 'dompurify';
import {
  Trophy, Zap, Home, LogOut, Search, RefreshCw, Edit, Lock,
  BarChart3, User, Globe, Building2, Code, Users,
  TrendingUp, Target, Calendar, UserPlus, Flame, MessageCircle
} from 'lucide-react';
import Toast from './components/Toast';
import Login from './components/Login';
import ProfileEdit from './components/ProfileEdit';
import PasswordChange from './components/PasswordChange';
import ConfirmDialog from './components/ConfirmDialog';
import './styles/App.css';

const API_URL = '/api';

function App() {
  const [view, setView] = useState('landing');
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [transitioning, setTransitioning] = useState(false);
  const [users, setUsers] = useState([]);
  const [toasts, setToasts] = useState([]);

  const showToast = (message, type = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
  };
  const removeToast = (id) => setToasts(prev => prev.filter(t => t.id !== id));

  useEffect(() => {
    const initializeApp = async () => {
      if (token) {
        try {
          const response = await axios.get(`${API_URL}/users/me`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          setCurrentUser(response.data);
          changeView('dashboard');
        } catch (error) {
          localStorage.removeItem('token');
          setToken(null);
        }
      }
      setLoading(false);
    };
    initializeApp();
  }, [token]);

  const changeView = (newView) => {
    setTransitioning(true);
    setTimeout(() => { setView(newView); setError(''); setTransitioning(false); }, 300);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setCurrentUser(null);
    changeView('landing');
    showToast('Logged out successfully', 'info');
  };

  if (loading) return <LoadingScreen />;

  return (
    <div className="game-container">
      <PageTransition active={transitioning} />
      <div style={{ position: 'fixed', top: 0, right: 0, zIndex: 10000 }}>
        {toasts.map(toast => (
          <Toast key={toast.id} message={toast.message} type={toast.type} onClose={() => removeToast(toast.id)} />
        ))}
      </div>
      {view === 'landing' && <LandingPage onNavigate={changeView} />}
      {view === 'auth-choice' && <AuthChoice onNavigate={changeView} />}
      {view === 'login' && <Login onNavigate={changeView} setToken={setToken} setCurrentUser={setCurrentUser} showToast={showToast} />}
      {view === 'leetcode-connect' && <LeetCodeConnect onNavigate={changeView} setToken={setToken} setError={setError} error={error} showToast={showToast} />}
      {view === 'education-info' && <EducationInfo onNavigate={changeView} setToken={setToken} setCurrentUser={setCurrentUser} setError={setError} error={error} showToast={showToast} />}
      {view === 'dashboard' && currentUser && <Dashboard user={currentUser} setUser={setCurrentUser} onNavigate={changeView} onLogout={handleLogout} showToast={showToast} />}
      {view === 'leaderboard' && <Leaderboard users={users} setUsers={setUsers} onNavigate={changeView} currentUser={currentUser} showToast={showToast} />}
    </div>
  );
}

function PageTransition({ active }) {
  return <div className={`page-transition ${active ? 'active' : ''}`}></div>;
}

function LoadingScreen() {
  return (
    <div className="loading-screen">
      <div className="pixel-logo"><div className="pixel-text">LOADING</div></div>
      <div className="loading-bar"><div className="loading-progress"></div></div>
      <div className="loading-text">INITIALIZING CODE MANAGER</div>
    </div>
  );
}

function LandingPage({ onNavigate }) {
  return (
    <div className="landing-page">
      <div className="game-title">
        <span className="title-line">CODE</span>
        <span className="title-line">MANAGER</span>
      </div>
      <div className="game-subtitle">DEVELOPER GROWTH PLATFORM</div>
      <div className="game-tagline">PRACTICE SMARTER • COMPETE MEANINGFULLY • GROW CONSISTENTLY</div>
      <div className="landing-features">
        <div className="feature-item"><TrendingUp size={20} /><span>Track your coding activity</span></div>
        <div className="feature-item"><Target size={20} /><span>Identify weak areas & improve</span></div>
        <div className="feature-item"><Trophy size={20} /><span>Compete with your university</span></div>
        <div className="feature-item"><Users size={20} /><span>Connect with fellow coders</span></div>
      </div>
      <div className="menu-options">
        <button className="pixel-button primary" onClick={() => onNavigate('auth-choice')}>
          <Zap size={18} strokeWidth={2.5} /> GET STARTED
        </button>
        <button className="pixel-button secondary" onClick={() => onNavigate('leaderboard')}>
          <Trophy size={18} strokeWidth={2.5} /> LEADERBOARD
        </button>
      </div>
    </div>
  );
}

function AuthChoice({ onNavigate }) {
  return (
    <div className="form-container">
      <button className="back-button" onClick={() => onNavigate('landing')}>← BACK</button>
      <h2 className="form-title">JOIN CODE MANAGER</h2>
      <p style={{ textAlign: 'center', color: 'var(--text-secondary)', marginBottom: '32px', fontSize: '14px', lineHeight: '1.6' }}>
        Track your coding journey and compete with peers
      </p>
      <div className="auth-choice-grid">
        <button className="pixel-button primary full-width" onClick={() => onNavigate('leetcode-connect')}>
          <UserPlus size={18} strokeWidth={2.5} /> SIGN UP
        </button>
        <button className="pixel-button full-width" onClick={() => onNavigate('login')}>
          <Lock size={18} strokeWidth={2.5} /> LOGIN
        </button>
      </div>
    </div>
  );
}

function LeetCodeConnect({ onNavigate, setToken, setError, error, showToast }) {
  const [leetcodeUsername, setLeetcodeUsername] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmMessage, setConfirmMessage] = useState('');

  const handleConnect = async (e) => {
    e.preventDefault();
    setVerifying(true);
    setError('');
    try {
      const response = await axios.post(`${API_URL}/auth/verify-leetcode`, { leetcodeUsername: leetcodeUsername.trim() });
      localStorage.setItem('tempLeetCodeData', JSON.stringify(response.data));
      showToast('LeetCode account verified!', 'success');
      onNavigate('education-info');
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to connect';
      setError(`ERROR: ${errorMessage}`);
      showToast(errorMessage, 'error');
      if (error.response?.data?.alreadyExists && error.response?.status === 409) {
        setConfirmMessage('This LeetCode account is already registered. Would you like to login instead?');
        setShowConfirm(true);
      }
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="form-container">
      <button className="back-button" onClick={() => onNavigate('auth-choice')}>← BACK</button>
      <h2 className="form-title">CONNECT LEETCODE</h2>
      {error && <div className="error-message">{error}</div>}
      <form className="pixel-form" onSubmit={handleConnect}>
        <div className="form-group">
          <label>LEETCODE USERNAME</label>
          <input type="text" className="pixel-input" placeholder="Enter your LeetCode username"
            value={leetcodeUsername} onChange={(e) => setLeetcodeUsername(e.target.value)} required />
        </div>
        <button type="submit" className="pixel-button primary full-width" disabled={verifying}>
          {verifying ? 'VERIFYING...' : 'VERIFY & CONTINUE'}
        </button>
        <div className="form-footer">
          <span style={{ color: 'var(--text-secondary)' }}>Already have an account?</span>
          <button type="button" className="link-button" onClick={() => onNavigate('login')}>LOGIN</button>
        </div>
      </form>
      {showConfirm && (
        <ConfirmDialog message={confirmMessage}
          onConfirm={() => { setShowConfirm(false); onNavigate('login'); }}
          onCancel={() => setShowConfirm(false)} />
      )}
    </div>
  );
}

function EducationInfo({ onNavigate, setToken, setCurrentUser, setError, error, showToast }) {
  const [formData, setFormData] = useState({ username: '', email: '', password: '', country: '', educationLevel: '', institutionName: '', year: '' });
  const [submitting, setSubmitting] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState({ score: 0, message: '', color: 'var(--text-tertiary)' });
  const [countries, setCountries] = useState([]);
  const [universities, setUniversities] = useState([]);
  const [showCustomInput, setShowCustomInput] = useState(false);

  const educationLevels = ['High School', 'Undergraduate', 'Graduate', 'PhD', 'Bootcamp', 'Self-Taught', 'Other'];
  const yearOptions = {
    'High School': ['Freshman', 'Sophomore', 'Junior', 'Senior'],
    'Undergraduate': ['Freshman', 'Sophomore', 'Junior', 'Senior', '5th Year+'],
    'Graduate': ['1st Year', '2nd Year', '3rd Year+'],
    'PhD': ['1st Year', '2nd Year', '3rd Year', '4th Year', '5th Year+'],
    'Bootcamp': ['Month 1-3', 'Month 4-6', 'Month 7-9', 'Month 10-12'],
    'Self-Taught': ['Beginner', 'Intermediate', 'Advanced'],
    'Other': ['N/A']
  };

  useEffect(() => { fetchCountries(); }, []);
  useEffect(() => {
    if (formData.country && formData.institutionName.length >= 2) searchUniversities(formData.institutionName);
  }, [formData.institutionName, formData.country]);

  const fetchCountries = async () => {
    try { const r = await axios.get(`${API_URL}/universities/countries`); setCountries(r.data); }
    catch (e) { console.error('Failed to fetch countries'); }
  };

  const searchUniversities = async (name) => {
    if (!formData.country) return;
    try { const r = await axios.get(`${API_URL}/universities/search`, { params: { name, country: formData.country } }); setUniversities(r.data); }
    catch (e) { console.error('Failed to search universities'); }
  };

  const checkPasswordStrength = (password) => {
    if (password.length === 0) return { score: 0, message: '', color: 'var(--text-tertiary)' };
    if (password.length < 8) return { score: 1, message: 'Too short (min 8 characters)', color: 'var(--text-primary)' };
    let score = 1;
    if (/[a-z]/.test(password)) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/\d/.test(password)) score++;
    if (/[^a-zA-Z\d]/.test(password)) score++;
    const messages = { 1: { message: 'Weak', color: 'var(--text-primary)' }, 2: { message: 'Fair', color: 'var(--text-primary)' }, 3: { message: 'Moderate', color: 'var(--text-secondary)' }, 4: { message: 'Good', color: 'var(--text-secondary)' }, 5: { message: 'Strong', color: 'var(--text-primary)' } };
    return { score, ...messages[score] };
  };

  const handlePasswordChange = (e) => {
    const password = e.target.value;
    setFormData({...formData, password});
    setPasswordStrength(checkPasswordStrength(password));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const leetcodeData = JSON.parse(localStorage.getItem('tempLeetCodeData'));
      const response = await axios.post(`${API_URL}/auth/register`, { ...formData, leetcodeUsername: leetcodeData.username, leetcodeData });
      localStorage.setItem('token', response.data.token);
      localStorage.removeItem('tempLeetCodeData');
      setToken(response.data.token);
      setCurrentUser(response.data.user);
      showToast('Welcome to Code Manager!', 'success');
      onNavigate('dashboard');
    } catch (error) {
      const errorMsg = error.response?.data?.message || 'Registration failed';
      setError(errorMsg);
      showToast(errorMsg, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="form-container">
      <button className="back-button" onClick={() => onNavigate('leetcode-connect')}>← BACK</button>
      <h2 className="form-title">YOUR INFO</h2>
      {error && <div className="error-message">{error}</div>}
      <form className="pixel-form" onSubmit={handleSubmit}>
        <div className="form-group">
          <label>USERNAME</label>
          <input type="text" className="pixel-input" placeholder="3-20 characters"
            value={formData.username} onChange={(e) => setFormData({...formData, username: e.target.value})} required />
        </div>
        <div className="form-group">
          <label>EMAIL</label>
          <input type="email" className="pixel-input" placeholder="your@email.com"
            value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} required />
        </div>
        <div className="form-group">
          <label>PASSWORD</label>
          <input type="password" className="pixel-input" placeholder="Min 8 chars"
            value={formData.password} onChange={handlePasswordChange} required />
          {formData.password && (
            <div style={{ marginTop: '8px' }}>
              <div style={{ fontSize: '10px', color: passwordStrength.color, marginBottom: '6px', fontWeight: 700 }}>{passwordStrength.message}</div>
              <div style={{ height: '3px', background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
                <div style={{ height: '100%', width: `${passwordStrength.score * 20}%`, background: 'var(--text-primary)', transition: 'all 0.3s' }}></div>
              </div>
            </div>
          )}
        </div>
        <div className="form-group">
          <label>COUNTRY</label>
          <select className="pixel-input" value={formData.country}
            onChange={(e) => setFormData({...formData, country: e.target.value, institutionName: ''})} required>
            <option value="">Select Country</option>
            {countries.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        {formData.country && (
          <div className="form-group">
            <label>INSTITUTION</label>
            {!showCustomInput ? (
              <>
                <input type="text" className="pixel-input" placeholder="Start typing to search..."
                  value={formData.institutionName} onChange={(e) => setFormData({...formData, institutionName: e.target.value})}
                  id="institution-search" name="institutionName" list="universities" required />
                <datalist id="universities">
                  {universities.map((uni, idx) => <option key={idx} value={uni.name}>{uni.name}</option>)}
                </datalist>
                <button type="button" className="link-button" onClick={() => setShowCustomInput(true)} style={{ marginTop: '8px', fontSize: '12px' }}>
                  Can't find your school? Add manually
                </button>
              </>
            ) : (
              <>
                <input type="text" className="pixel-input" placeholder="Enter institution name"
                  value={formData.institutionName} onChange={(e) => setFormData({...formData, institutionName: e.target.value})} required />
                <button type="button" className="link-button" onClick={() => setShowCustomInput(false)} style={{ marginTop: '8px', fontSize: '12px' }}>← Back to search</button>
              </>
            )}
          </div>
        )}
        <div className="form-group">
          <label>EDUCATION LEVEL</label>
          <select className="pixel-input" value={formData.educationLevel}
            onChange={(e) => setFormData({...formData, educationLevel: e.target.value, year: ''})} required>
            <option value="">Select</option>
            {educationLevels.map(l => <option key={l} value={l}>{l}</option>)}
          </select>
        </div>
        {formData.educationLevel && (
          <div className="form-group">
            <label>YEAR</label>
            <select className="pixel-input" value={formData.year}
              onChange={(e) => setFormData({...formData, year: e.target.value})} required>
              <option value="">Select</option>
              {yearOptions[formData.educationLevel]?.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        )}
        <button type="submit" className="pixel-button primary full-width" disabled={submitting || passwordStrength.score < 3}>
          {submitting ? 'CREATING ACCOUNT...' : 'JOIN CODE MANAGER'}
        </button>
      </form>
    </div>
  );
}

function ActivityHeatmap({ activityDates }) {
  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
  const year = now.getFullYear();
  const startDate = new Date(year, 0, 1);
  const endDate = new Date(year, 11, 31);

  const activityMap = {};
  (activityDates || []).forEach(a => { activityMap[a.date] = a.problemsSolved; });

  const weeks = [];
  const cursor = new Date(startDate);
  cursor.setDate(cursor.getDate() - cursor.getDay());

  while (cursor <= endDate) {
    const week = [];
    for (let d = 0; d < 7; d++) {
      const dateStr = `${cursor.getFullYear()}-${String(cursor.getMonth()+1).padStart(2,'0')}-${String(cursor.getDate()).padStart(2,'0')}`;
      const isBeforeYear = cursor < startDate;
      const isAfterYear = cursor > endDate;
      const isFuture = dateStr > todayStr;
      week.push({
        date: dateStr,
        count: activityMap[dateStr] || 0,
        isFuture,
        isOutOfRange: isBeforeYear || isAfterYear,
        month: cursor.getMonth(),
      });
      cursor.setDate(cursor.getDate() + 1);
    }
    weeks.push(week);
  }

  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

  const getColor = (count, isFuture, isOutOfRange) => {
    if (isOutOfRange) return 'transparent';
    if (isFuture) return '#f0f0f0';
    if (count === 0) return '#ebedf0';
    if (count === 1) return '#9be9a8';
    if (count === 2) return '#40c463';
    if (count <= 4) return '#30a14e';
    return '#216e39';
  };

  const monthLabels = [];
  weeks.forEach((week, wi) => {
    const prevMonth = wi > 0 ? weeks[wi-1][0].month : -1;
    if (week[0].month !== prevMonth && !week[0].isOutOfRange) {
      monthLabels[wi] = months[week[0].month];
    }
  });

  return (
    <div className="custom-heatmap">
      <div style={{ display: 'flex', width: '100%' }}>
        <div className="heatmap-day-labels">
          <div style={{ height: '20px' }} />
          {days.map(day => (
            <div key={day} className="heatmap-day-label">{day}</div>
          ))}
        </div>
        <div style={{ flex: 1, overflow: 'hidden' }}>
          <div className="heatmap-months-row">
            {weeks.map((week, wi) => (
              <div key={wi} className="heatmap-month-cell">{monthLabels[wi] || ''}</div>
            ))}
          </div>
          <div className="heatmap-grid">
            {weeks.map((week, wi) => (
              <div key={wi} className="heatmap-week">
                {week.map((day, di) => (
                  <div
                    key={di}
                    className="heatmap-cell"
                    style={{ background: getColor(day.count, day.isFuture, day.isOutOfRange) }}
                    title={!day.isFuture && !day.isOutOfRange ? `${day.date}: ${day.count} problem${day.count !== 1 ? 's' : ''}` : ''}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="heatmap-legend">
        <span>Less</span>
        {['#ebedf0','#9be9a8','#40c463','#30a14e','#216e39'].map((c,i) => (
          <div key={i} className="legend-cell" style={{ background: c }} />
        ))}
        <span>More</span>
      </div>
    </div>
  );
}

function Dashboard({ user, setUser, onNavigate, onLogout, showToast }) {
  const [refreshing, setRefreshing] = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [weeklyGoalTarget, setWeeklyGoalTarget] = useState(user?.weeklyGoal?.target || 5);
  const [editingGoal, setEditingGoal] = useState(false);

  useEffect(() => {
    const autoRefresh = async () => {
      try {
        const response = await axios.post(`${API_URL}/users/refresh-stats`, {}, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        setUser(response.data.user);
      } catch (error) { console.error('Auto-refresh failed:', error); }
    };
    autoRefresh();
  }, []);

  if (!user) return <LoadingScreen />;

  const handleRefreshStats = async () => {
    setRefreshing(true);
    try {
      const response = await axios.post(`${API_URL}/users/refresh-stats`, {}, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setUser(response.data.user);
      showToast('Stats refreshed!', 'success');
    } catch (error) { showToast('Failed to refresh stats', 'error'); }
    finally { setRefreshing(false); }
  };

  const handleSaveProfile = async (data) => {
    const response = await axios.put(`${API_URL}/users/profile`, data, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    });
    setUser(response.data.user);
    setShowEditProfile(false);
  };

  const handleChangePassword = async (data) => {
    await axios.put(`${API_URL}/users/change-password`, data, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    });
  };

  const handleSaveGoal = async () => {
    try {
      await axios.put(`${API_URL}/users/weekly-goal`, { target: weeklyGoalTarget },
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
      setUser({ ...user, weeklyGoal: { ...user.weeklyGoal, target: weeklyGoalTarget } });
      setEditingGoal(false);
      showToast('Weekly goal updated!', 'success');
    } catch (error) { showToast('Failed to update goal', 'error'); }
  };

  const topics = [
    { name: 'Arrays', count: Math.floor((user.easy || 0) * 0.4), color: '#4CAF50' },
    { name: 'Strings', count: Math.floor((user.easy || 0) * 0.3), color: '#2196F3' },
    { name: 'Dynamic Programming', count: Math.floor((user.medium || 0) * 0.2), color: '#FF9800' },
    { name: 'Trees', count: Math.floor((user.medium || 0) * 0.25), color: '#9C27B0' },
    { name: 'Graphs', count: Math.floor((user.hard || 0) * 0.3), color: '#F44336' },
    { name: 'Linked Lists', count: Math.floor((user.easy || 0) * 0.2), color: '#00BCD4' },
  ];
  const weakestTopic = topics.reduce((min, t) => t.count < min.count ? t : min, topics[0]);

  const weeklyProgress = user.weeklyGoal?.current || 0;
  const weeklyTarget = user.weeklyGoal?.target || 5;
  const weeklyPercentage = Math.min(100, Math.round((weeklyProgress / weeklyTarget) * 100));

  const startOfWeek = new Date();
  const today = new Date();
  startOfWeek.setDate(today.getDate() - today.getDay());
  const daysOfWeek = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const thisWeekActivity = daysOfWeek.map((day, index) => {
    const date = new Date(startOfWeek);
    date.setDate(startOfWeek.getDate() + index);
    const dateStr = date.toISOString().split('T')[0];
    const activity = (user.activityDates || []).find(a => a.date === dateStr);
    return { day, solved: activity?.problemsSolved || 0, active: !!activity };
  });

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <div className="user-info">
          <div className="user-avatar"><User size={32} strokeWidth={2} /></div>
          <div>
            <h2>{user.username}</h2>
            <p><Globe size={12} style={{ display: 'inline', marginRight: '4px' }} />{user.country}</p>
            <p><Building2 size={12} style={{ display: 'inline', marginRight: '4px' }} />{user.institutionName} • {user.year}</p>
            <p style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>LeetCode: {user.leetcodeUsername}</p>
          </div>
        </div>
        <div className="header-actions">
          <button className="pixel-button" onClick={() => setShowEditProfile(true)}><Edit size={14} /> EDIT</button>
          <button className="pixel-button" onClick={() => setShowChangePassword(true)}><Lock size={14} /> PASSWORD</button>
          <button className="pixel-button" onClick={handleRefreshStats} disabled={refreshing}>
            <RefreshCw size={14} className={refreshing ? 'spinning' : ''} />{refreshing ? 'SYNCING...' : 'SYNC'}
          </button>
          <button className="pixel-button" onClick={() => onNavigate('leaderboard')}><Trophy size={14} /> LEADERBOARD</button>
          <button className="pixel-button secondary" onClick={onLogout}><LogOut size={14} /> LOGOUT</button>
        </div>
      </div>

      <div className="dashboard-tabs">
        <button className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')}><BarChart3 size={16} /> Overview</button>
        <button className={`tab-btn ${activeTab === 'tracker' ? 'active' : ''}`} onClick={() => setActiveTab('tracker')}><Calendar size={16} /> Tracker</button>
        <button className={`tab-btn ${activeTab === 'solutions' ? 'active' : ''}`} onClick={() => setActiveTab('solutions')}><Code size={16} /> My Solutions</button>
        <button className={`tab-btn ${activeTab === 'friends' ? 'active' : ''}`} onClick={() => setActiveTab('friends')}><Users size={16} /> Friends</button>
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
              <div className="stat-value" style={{ color: '#4CAF50' }}>{user.easy || 0}</div>
              <div className="stat-label">EASY</div>
            </div>
            <div className="stat-card">
              <div className="stat-value" style={{ color: '#FF9800' }}>{user.medium || 0}</div>
              <div className="stat-label">MEDIUM</div>
            </div>
            <div className="stat-card">
              <div className="stat-value" style={{ color: '#F44336' }}>{user.hard || 0}</div>
              <div className="stat-label">HARD</div>
            </div>
          </div>

          <div className="section-card">
            <h3 className="section-title"><TrendingUp size={18} /> Difficulty Breakdown</h3>
            <div className="difficulty-bars">
              {[
                { label: 'Easy', count: user.easy || 0, total: user.problems || 1, color: '#4CAF50' },
                { label: 'Medium', count: user.medium || 0, total: user.problems || 1, color: '#FF9800' },
                { label: 'Hard', count: user.hard || 0, total: user.problems || 1, color: '#F44336' }
              ].map(({ label, count, total, color }) => (
                <div key={label} className="difficulty-bar-row">
                  <span className="difficulty-label" style={{ color }}>{label}</span>
                  <div className="difficulty-bar-track">
                    <div className="difficulty-bar-fill" style={{ width: `${(count / total) * 100}%`, background: color }} />
                  </div>
                  <span className="difficulty-count">{count}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="section-card">
            <h3 className="section-title"><Target size={18} /> Topic Coverage <span style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginLeft: '8px', fontWeight: 400 }}>(estimated)</span></h3>
            <div className="topic-bars">
              {topics.map(({ name, count, color }) => (
                <div key={name} className="topic-bar-row">
                  <span className="topic-label">{name}</span>
                  <div className="topic-bar-track">
                    <div className="topic-bar-fill" style={{ width: `${(count / Math.max(...topics.map(t => t.count), 1)) * 100}%`, background: color }} />
                  </div>
                  <span className="topic-count">{count}</span>
                </div>
              ))}
            </div>
            <div className="focus-suggestion"><Target size={14} /><span>Focus on <strong>{weakestTopic.name}</strong> — your least practiced topic</span></div>
          </div>

          <div className="section-card">
            <h3 className="section-title"><Trophy size={18} /> Your Rankings</h3>
            <div className="rankings-grid">
              <div className="ranking-item"><Globe size={16} /><span>Global</span><strong>#{user.rank || '-'}</strong></div>
              <div className="ranking-item"><Globe size={16} /><span>{user.country}</span><strong>-</strong></div>
              <div className="ranking-item"><Building2 size={16} /><span>{user.institutionName?.split(' ').slice(0,2).join(' ')}</span><strong>-</strong></div>
            </div>
            <button className="pixel-button primary full-width" style={{ marginTop: '16px' }} onClick={() => onNavigate('leaderboard')}>
              <Trophy size={14} /> VIEW FULL LEADERBOARD
            </button>
          </div>

          <div className="section-card coming-soon-section">
            <h3 className="section-title"><Zap size={18} /> Coming Soon</h3>
            <div className="coming-soon-grid">
              <div className="coming-soon-item"><MessageCircle size={20} /><span>Email Reminders</span><p>Daily coding reminders</p></div>
              <div className="coming-soon-item"><Target size={20} /><span>Smart Analytics</span><p>Track real topics solved</p></div>
              <div className="coming-soon-item"><Trophy size={20} /><span>Weekly Contests</span><p>Compete with peers</p></div>
              <div className="coming-soon-item"><Zap size={20} /><span>Achievements</span><p>Unlock badges</p></div>
            </div>
          </div>
        </>
      )}

      {activeTab === 'tracker' && (
        <>
          <div className="stats-grid">
            <div className="stat-card streak-fire">
              <div className="stat-icon"><Flame size={28} style={{ color: '#FF6B35' }} /></div>
              <div className="stat-value" style={{ color: '#FF6B35' }}>{user.currentStreak || 0}</div>
              <div className="stat-label">CURRENT STREAK</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{user.longestStreak || 0}</div>
              <div className="stat-label">LONGEST STREAK</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{(user.activityDates || []).length}</div>
              <div className="stat-label">ACTIVE DAYS</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{weeklyProgress}</div>
              <div className="stat-label">THIS WEEK</div>
            </div>
          </div>

          <div className="section-card">
            <h3 className="section-title"><Calendar size={18} /> Activity Calendar</h3>
            <ActivityHeatmap activityDates={user.activityDates || []} />
          </div>

          <div className="section-card">
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

          <div className="section-card">
            <h3 className="section-title">
              <Target size={18} /> Weekly Goal
              <button className="link-button" style={{ marginLeft: 'auto', fontSize: '12px' }} onClick={() => setEditingGoal(!editingGoal)}>
                {editingGoal ? 'Cancel' : 'Edit'}
              </button>
            </h3>
            {editingGoal ? (
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <input type="number" className="pixel-input" value={weeklyGoalTarget}
                  onChange={(e) => setWeeklyGoalTarget(Number(e.target.value))} min="1" max="50" style={{ width: '100px' }} />
                <span style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>problems/week</span>
                <button className="pixel-button primary" onClick={handleSaveGoal}>Save</button>
              </div>
            ) : (
              <>
                <div className="goal-progress-text">
                  <span>{weeklyProgress} / {weeklyTarget} problems</span>
                  <span style={{ color: weeklyPercentage >= 100 ? '#4CAF50' : 'var(--text-secondary)' }}>
                    {weeklyPercentage >= 100 ? '✓ Goal Achieved!' : `${weeklyPercentage}%`}
                  </span>
                </div>
                <div className="goal-progress-bar">
                  <div className="goal-progress-fill" style={{ width: `${weeklyPercentage}%`, background: weeklyPercentage >= 100 ? '#4CAF50' : 'var(--text-primary)' }} />
                </div>
              </>
            )}
          </div>

          <div className="section-card" style={{ textAlign: 'center', padding: '32px' }}>
            {(user.currentStreak || 0) === 0 ? (
              <>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}><Target size={48} /></div>
                <h3 style={{ color: 'var(--text-primary)', marginBottom: '8px' }}>Start Your Streak Today!</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Solve a problem on LeetCode and sync your stats to begin your streak.</p>
                <button className="pixel-button primary" style={{ marginTop: '16px' }} onClick={handleRefreshStats}>
                  <RefreshCw size={14} /> SYNC STATS
                </button>
              </>
            ) : (
              <>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}><Flame size={48} style={{ color: '#FF6B35' }} /></div>
                <h3 style={{ color: '#FF6B35', marginBottom: '8px' }}>{user.currentStreak} Day Streak!</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Keep it up! Your longest streak is {user.longestStreak || 0} days.</p>
              </>
            )}
          </div>
        </>
      )}
      {activeTab === 'solutions' && <MySolutionsTab showToast={showToast} />}
      {activeTab === 'friends' && <FriendsTab currentUser={user} showToast={showToast} />}

      {showEditProfile && <ProfileEdit user={user} onSave={handleSaveProfile} onCancel={() => setShowEditProfile(false)} showToast={showToast} />}
      {showChangePassword && <PasswordChange onSave={handleChangePassword} onCancel={() => setShowChangePassword(false)} showToast={showToast} />}
    </div>
  );
}

function Leaderboard({ users, setUsers, onNavigate, currentUser, showToast }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCountry, setSelectedCountry] = useState('all');
  const [selectedInstitution, setSelectedInstitution] = useState('all');
  const [loading, setLoading] = useState(true);
  const [countries, setCountries] = useState([]);
  const [institutions, setInstitutions] = useState([]);
  const [viewMode, setViewMode] = useState('global');

  useEffect(() => { fetchLeaderboard(); fetchCountries(); }, [selectedCountry, selectedInstitution]);
  useEffect(() => { if (selectedCountry && selectedCountry !== 'all') fetchInstitutions(selectedCountry); }, [selectedCountry]);

  const fetchLeaderboard = async () => {
    setLoading(true);
    try {
      const params = {};
      if (selectedCountry !== 'all') params.country = selectedCountry;
      if (selectedInstitution !== 'all') params.institution = selectedInstitution;
      const response = await axios.get(`${API_URL}/leaderboard`, { params });
      setUsers(response.data || []);
    } catch (error) { showToast('Failed to load leaderboard', 'error'); setUsers([]); }
    finally { setLoading(false); }
  };

  const fetchCountries = async () => {
    try { const r = await axios.get(`${API_URL}/leaderboard/countries`); setCountries(r.data || []); }
    catch (e) { console.error('Failed to fetch countries'); }
  };

  const fetchInstitutions = async (country) => {
    try {
      const params = country !== 'all' ? { country } : {};
      const r = await axios.get(`${API_URL}/leaderboard/institutions`, { params });
      setInstitutions(r.data || []);
    } catch (e) { console.error('Failed to fetch institutions'); }
  };

  const handleViewChange = (mode) => {
    setViewMode(mode);
    if (mode === 'global') { setSelectedCountry('all'); setSelectedInstitution('all'); }
    else if (mode === 'country' && currentUser) { setSelectedCountry(currentUser.country); setSelectedInstitution('all'); }
    else if (mode === 'institution' && currentUser) { setSelectedCountry(currentUser.country); setSelectedInstitution(currentUser.institutionName); }
  };

  const filteredUsers = users.filter(user => {
    if (!user || !user.username) return false;
    return user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (user.institutionName && user.institutionName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (user.country && user.country.toLowerCase().includes(searchQuery.toLowerCase()));
  });

  const topThree = filteredUsers.slice(0, 3).concat(Array(Math.max(0, 3 - filteredUsers.length)).fill(null));
  const restUsers = filteredUsers.slice(3);

  if (loading) return <div className="leaderboard"><div className="loading-message">LOADING...</div></div>;

  return (
    <div className="leaderboard">
      <div className="leaderboard-header">
        <h2><Trophy size={28} /> LEADERBOARD</h2>
        <button className="pixel-button" onClick={() => onNavigate(currentUser ? 'dashboard' : 'landing')}>
          <Home size={16} /> {currentUser ? 'DASHBOARD' : 'HOME'}
        </button>
      </div>
      <div className="leaderboard-tabs">
        <button className={`tab-button ${viewMode === 'global' ? 'active' : ''}`} onClick={() => handleViewChange('global')}><Globe size={16} /> GLOBAL</button>
        {currentUser && (
          <>
            <button className={`tab-button ${viewMode === 'country' ? 'active' : ''}`} onClick={() => handleViewChange('country')}><Globe size={16} /> MY COUNTRY</button>
            <button className={`tab-button ${viewMode === 'institution' ? 'active' : ''}`} onClick={() => handleViewChange('institution')}><Building2 size={16} /> MY UNIVERSITY</button>
          </>
        )}
      </div>
      {users.length === 0 ? <div className="empty-message">No users yet</div> : (
        <>
          <div className="filter-section">
            <div className="search-bar">
              <Search size={18} />
              <input type="text" className="search-input pixel-input" placeholder="Search..."
                value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
            </div>
            <div className="college-filter">
              <label>Country:</label>
              <select value={selectedCountry} onChange={(e) => { setSelectedCountry(e.target.value); setSelectedInstitution('all'); }}>
                <option value="all">All</option>
                {countries.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            {selectedCountry !== 'all' && (
              <div className="college-filter">
                <label>Institution:</label>
                <select value={selectedInstitution} onChange={(e) => setSelectedInstitution(e.target.value)}>
                  <option value="all">All</option>
                  {institutions.map(inst => <option key={inst} value={inst}>{inst}</option>)}
                </select>
              </div>
            )}
          </div>
          <div className="podium">
            {[topThree[1], topThree[0], topThree[2]].map((user, index) => {
              const place = index === 1 ? 1 : index === 0 ? 2 : 3;
              const placeIcons = [<Trophy size={24} />, <Trophy size={20} />, <Trophy size={18} />];
              if (!user) return (
                <div key={`empty-${place}`} className={`podium-place place-${place}`}>
                  <div className="podium-rank">{placeIcons[place-1]}</div>
                  <div className="podium-avatar"><User size={32} /></div>
                  <div className="podium-name">Empty</div>
                  <div className="podium-score">- pts</div>
                  <div className="podium-college">-</div>
                </div>
              );
              return (
                <div key={user._id} className={`podium-place place-${place}`}>
                  <div className="podium-rank">{placeIcons[place-1]}</div>
                  <div className="podium-avatar"><User size={32} /></div>
                  <div className="podium-name">{user.username}</div>
                  <div className="podium-score">{user.score} pts</div>
                  <div className="podium-college">
                    {user.institutionName}
                    <div style={{ fontSize: '10px', color: 'var(--text-tertiary)', marginTop: '4px' }}>{user.country}</div>
                  </div>
                </div>
              );
            })}
          </div>
          {restUsers.length > 0 && (
            <div className="leaderboard-table">
              <div className="table-header">
                <div>RANK</div><div>USER</div><div>COUNTRY</div><div>INSTITUTION</div><div>PROBLEMS</div><div>SCORE</div>
              </div>
              {restUsers.map((user, index) => (
                <div key={user._id} className="table-row">
                  <div className="table-cell"><span className="rank-badge">#{index + 4}</span></div>
                  <div className="table-cell"><span className="user-avatar-small"><User size={14} /></span>{user.username}</div>
                  <div className="table-cell">{user.country}</div>
                  <div className="table-cell">{user.institutionName}</div>
                  <div className="table-cell">{user.problems}</div>
                  <div className="table-cell">{user.score}</div>
                </div>
              ))}
            </div>
          )}
          {filteredUsers.length === 0 && users.length > 0 && <div className="empty-message">No results found</div>}
        </>
      )}
    </div>
  );
}

function FriendsTab({ currentUser, showToast }) {
  const [friends, setFriends] = useState([]);
  const [requests, setRequests] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState('friends');
  const [selectedFriend, setSelectedFriend] = useState(null);
  const [chatFriend, setChatFriend] = useState(null);

  const token = localStorage.getItem('token');
  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    fetchFriends();
    fetchRequests();
  }, []);

  const fetchFriends = async () => {
    try {
      const r = await axios.get('/api/friends', { headers });
      setFriends(r.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const fetchRequests = async () => {
    try {
      const r = await axios.get('/api/friends/requests', { headers });
      setRequests(r.data);
    } catch (e) { console.error(e); }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const r = await axios.get(`/api/friends/search/${searchQuery}`, { headers });
      setSearchResults(r.data);
    } catch (e) { showToast('Search failed', 'error'); }
    finally { setSearching(false); }
  };

  const handleSendRequest = async (username) => {
    try {
      await axios.post('/api/friends/send', { username }, { headers });
      showToast(`Friend request sent to ${username}!`, 'success');
      setSearchResults(prev => prev.filter(u => u.username !== username));
    } catch (e) { showToast(e.response?.data?.message || 'Failed to send request', 'error'); }
  };

  const handleAccept = async (requestId) => {
    try {
      await axios.post(`/api/friends/accept/${requestId}`, {}, { headers });
      showToast('Friend request accepted!', 'success');
      fetchFriends();
      fetchRequests();
    } catch (e) { showToast('Failed to accept request', 'error'); }
  };

  const handleDecline = async (requestId) => {
    try {
      await axios.post(`/api/friends/decline/${requestId}`, {}, { headers });
      showToast('Request declined', 'info');
      fetchRequests();
    } catch (e) { showToast('Failed to decline request', 'error'); }
  };

  const handleRemoveFriend = async (friendId) => {
    try {
      await axios.delete(`/api/friends/${friendId}`, { headers });
      showToast('Friend removed', 'info');
      fetchFriends();
    } catch (e) { showToast('Failed to remove friend', 'error'); }
  };

  return (
    <div>
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
        {['friends', 'requests', 'search'].map(section => (
          <button key={section} className={`pixel-button ${activeSection === section ? 'primary' : ''}`}
            onClick={() => setActiveSection(section)} style={{ position: 'relative' }}>
            {section === 'friends' && <><Users size={14} /> MY FRIENDS ({friends.length})</>}
            {section === 'requests' && <><UserPlus size={14} /> REQUESTS {requests.length > 0 && <span className="notif-badge">{requests.length}</span>}</>}
            {section === 'search' && <><Search size={14} /> FIND FRIENDS</>}
          </button>
        ))}
      </div>

      {activeSection === 'friends' && (
        <div>
          {loading ? (
            <div className="empty-state">Loading...</div>
          ) : friends.length === 0 ? (
            <div className="empty-state">
              <Users size={48} style={{ opacity: 0.3, marginBottom: '16px' }} />
              <h3>No friends yet!</h3>
              <p>Search for friends to add them</p>
              <button className="pixel-button primary" style={{ marginTop: '16px' }} onClick={() => setActiveSection('search')}>
                <Search size={14} /> FIND FRIENDS
              </button>
            </div>
          ) : (
            <div className="friends-list">
              {friends.map(friend => (
                <div key={friend._id} className="friend-card" style={{ cursor: 'pointer' }} onClick={() => setSelectedFriend(friend)}>
                  <div className="friend-avatar"><User size={24} /></div>
                  <div className="friend-info">
                    <div className="friend-name">{friend.username}</div>
                    <div className="friend-meta">{friend.country} • {friend.institutionName?.split(' ').slice(0,3).join(' ')}</div>
                    <div className="friend-stats">
                      <span className="friend-stat"><Flame size={12} /> {friend.currentStreak || 0} streak</span>
                      <span className="friend-stat" style={{ color: '#4CAF50' }}>E: {friend.easy || 0}</span>
                      <span className="friend-stat" style={{ color: '#FF9800' }}>M: {friend.medium || 0}</span>
                      <span className="friend-stat" style={{ color: '#F44336' }}>H: {friend.hard || 0}</span>
                      <span className="friend-stat">Total: {friend.problems || 0}</span>
                    </div>
                  </div>
                  <button className="pixel-button" style={{ fontSize: '11px', padding: '6px 12px' }}
                    onClick={(e) => { e.stopPropagation(); handleRemoveFriend(friend._id); }}>
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeSection === 'requests' && (
        <div>
          {requests.length === 0 ? (
            <div className="empty-state">
              <UserPlus size={48} style={{ opacity: 0.3, marginBottom: '16px' }} />
              <h3>No pending requests</h3>
              <p>When someone sends you a friend request, it'll appear here</p>
            </div>
          ) : (
            <div className="friends-list">
              {requests.map(req => (
                <div key={req._id} className="friend-card">
                  <div className="friend-avatar"><User size={24} /></div>
                  <div className="friend-info">
                    <div className="friend-name">{req.from.username}</div>
                    <div className="friend-meta">{req.from.country} • {req.from.problems} problems solved</div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button className="pixel-button primary" style={{ fontSize: '11px', padding: '6px 12px' }} onClick={() => handleAccept(req._id)}>✓ Accept</button>
                    <button className="pixel-button" style={{ fontSize: '11px', padding: '6px 12px' }} onClick={() => handleDecline(req._id)}>✗ Decline</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeSection === 'search' && (
        <div>
          <form onSubmit={handleSearch} style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
            <input type="text" className="pixel-input" placeholder="Search by username..."
              value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} style={{ flex: 1 }} />
            <button type="submit" className="pixel-button primary" disabled={searching}>
              <Search size={14} /> {searching ? 'SEARCHING...' : 'SEARCH'}
            </button>
          </form>
          {searchResults.length === 0 && searchQuery && !searching && (
            <div className="empty-state"><p>No users found for "{searchQuery}"</p></div>
          )}
          <div className="friends-list">
            {searchResults.map(user => (
              <div key={user._id} className="friend-card">
                <div className="friend-avatar"><User size={24} /></div>
                <div className="friend-info">
                  <div className="friend-name">{user.username}</div>
                  <div className="friend-meta">{user.country} • {user.institutionName?.split(' ').slice(0,3).join(' ')}</div>
                  <div className="friend-stats">
                    <span className="friend-stat" style={{ color: '#4CAF50' }}>E: {user.easy || 0}</span>
                    <span className="friend-stat" style={{ color: '#FF9800' }}>M: {user.medium || 0}</span>
                    <span className="friend-stat" style={{ color: '#F44336' }}>H: {user.hard || 0}</span>
                    <span className="friend-stat">Total: {user.problems || 0}</span>
                  </div>
                </div>
                <button className="pixel-button primary" style={{ fontSize: '11px', padding: '6px 12px' }}
                  onClick={() => handleSendRequest(user.username)}>
                  <UserPlus size={12} /> ADD
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {selectedFriend && (
        <FriendProfileModal 
          friend={selectedFriend} 
          onClose={() => setSelectedFriend(null)}
          onMessage={(friend) => { 
            setSelectedFriend(null); 
            setChatFriend(friend); 
          }}
          onRemove={(friendId) => { 
            handleRemoveFriend(friendId); 
            setSelectedFriend(null); 
          }} 
        />
      )}

      {chatFriend && (
        <ChatModal
          friend={chatFriend}
          currentUser={currentUser}
          onClose={() => setChatFriend(null)}
          showToast={showToast}
        />
      )}
    </div>
  );
}

function FriendProfileModal({ friend, onClose, onMessage, onRemove }) {
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
          <button className="pixel-button" onClick={onClose}>✕</button>
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
              <div style={{ fontSize: '24px', fontWeight: '700', color: 'var(--text-primary)' }}>{(friend.activityDates || []).length}</div>
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
              <strong>-</strong>
            </div>
            <div className="ranking-item">
              <Building2 size={16} />
              <span>University</span>
              <strong>-</strong>
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

function ChatModal({ friend, currentUser, onClose, showToast }) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [socket, setSocket] = useState(null);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  const token = localStorage.getItem('token');

  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const response = await axios.get(`/api/messages/${friend._id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setMessages(response.data);
      } catch (error) {
        console.error('Failed to fetch messages:', error);
      }
    };
    
    // Fetch messages immediately
    fetchMessages();
    
    // Poll for new messages every 3 seconds
    const pollInterval = setInterval(fetchMessages, 3000);

    // Socket.io with JWT auth
    const newSocket = io(window.location.origin, {
      auth: { token }
    });
    setSocket(newSocket);

    newSocket.on('receive_message', (message) => {
      if (message.from === friend._id) {
        setMessages(prev => {
          // Avoid duplicates
          if (prev.find(m => m._id === message._id)) return prev;
          return [...prev, message];
        });
        scrollToBottom();
      }
    });

    newSocket.on('user_typing', (data) => {
      if (data.from === friend._id) setIsTyping(true);
    });

    newSocket.on('user_stopped_typing', (data) => {
      if (data.from === friend._id) setIsTyping(false);
    });

    return () => {
      clearInterval(pollInterval);
      newSocket.disconnect();
    };
  }, [friend._id, token]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    try {
      // Save to database first
      await axios.post('/api/messages/send', {
        to: friend._id,
        content: newMessage.trim()
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // Also emit via socket for real-time
      if (socket) {
        socket.emit('send_message', {
          to: friend._id,
          content: newMessage.trim()
        });
      }

      // Optimistically add to UI
      const tempMessage = {
        _id: Date.now(),
        from: currentUser._id || currentUser.id,
        to: friend._id,
        content: newMessage.trim(),
        createdAt: new Date()
      };
      setMessages(prev => [...prev, tempMessage]);
      setNewMessage('');
      scrollToBottom();
    } catch (error) {
      showToast('Failed to send message', 'error');
    }
  };

  const handleTyping = () => {
    if (!socket) return;
    socket.emit('typing', { to: friend._id });
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('stop_typing', { to: friend._id });
    }, 2000);
  };

  const formatTime = (date) => {
    const d = new Date(date);
    return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content chat-modal" onClick={(e) => e.stopPropagation()}>
        <div className="chat-header">
          <div className="friend-avatar"><User size={32} /></div>
          <div style={{ flex: 1 }}>
            <h3>{friend.username}</h3>
            <p style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>
              {friend.country} • {friend.institutionName}
            </p>
          </div>
          <button className="pixel-button" onClick={onClose}>✕</button>
        </div>

        <div className="chat-messages">
          {messages.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-tertiary)' }}>
              <p>No messages yet. Say hi!</p>
            </div>
          ) : (
            messages.map((msg, idx) => {
              const isMe = (msg.from?._id || msg.from)?.toString() === (currentUser._id || currentUser.id)?.toString();
              return (
                <div key={msg._id || idx} className={`chat-message ${isMe ? 'chat-message-me' : 'chat-message-them'}`}>
                  <div className="chat-bubble">
                    <p>{msg.content}</p>
                    <span className="chat-time">{formatTime(msg.createdAt)}</span>
                  </div>
                </div>
              );
            })
          )}
          {isTyping && (
            <div className="chat-message chat-message-them">
              <div className="chat-bubble typing-indicator">
                <span></span><span></span><span></span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <form className="chat-input-form" onSubmit={handleSendMessage}>
          <input
            type="text"
            className="pixel-input"
            placeholder="Type a message..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={handleTyping}
            autoFocus
          />
          <button type="submit" className="pixel-button primary" disabled={!newMessage.trim()}>
            SEND
          </button>
        </form>
      </div>
    </div>
  );
}

function MySolutionsTab({ showToast }) {
  const [solutions, setSolutions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [viewingSolution, setViewingSolution] = useState(null);
  const [problemInput, setProblemInput] = useState('');
  const [fetchingProblem, setFetchingProblem] = useState(false);
  const [problemData, setProblemData] = useState(null);
  const [editingSnippetId, setEditingSnippetId] = useState(null);
  const [editingNoteId, setEditingNoteId] = useState(null);
  const [solutionData, setSolutionData] = useState({
    code: '',
    language: 'Python',
    runtime: '',
    memory: '',
    notes: '',
    personalRating: 3
  });

  const token = localStorage.getItem('token');
  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => { fetchSolutions(); }, []);

  const fetchSolutions = async () => {
    try {
      const snippets = await axios.get('/api/snippets', { headers });
      const notes = await axios.get('/api/notes', { headers });
      
      const combined = {};
      snippets.data.forEach(s => {
        if (!combined[s.problemName]) combined[s.problemName] = {};
        combined[s.problemName].snippet = s;
      });
      notes.data.forEach(n => {
        if (!combined[n.problemName]) combined[n.problemName] = {};
        combined[n.problemName].note = n;
      });
      
      setSolutions(Object.entries(combined).map(([name, data]) => ({ 
        problemName: name, 
        ...data,
        difficulty: data.snippet?.difficulty || data.note?.difficulty,
        topics: data.snippet?.topics || data.note?.topics || []
      })));
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const extractTitleSlug = (input) => {
    const urlMatch = input.match(/leetcode\.com\/problems\/([^\/]+)/);
    if (urlMatch) return urlMatch[1];
    return input.toLowerCase().replace(/\s+/g, '-');
  };

  const handleFetchProblem = async () => {
    if (!problemInput.trim()) return;
    setFetchingProblem(true);
    try {
      const titleSlug = extractTitleSlug(problemInput);
      const response = await axios.post('/api/leetcode/problem', { titleSlug }, { headers });
      setProblemData(response.data);
      showToast('Problem loaded!', 'success');
    } catch (error) {
      showToast('Problem not found', 'error');
      setProblemData(null);
    } finally {
      setFetchingProblem(false);
    }
  };

  const handleSaveSolution = async () => {
    if (!problemData) return;
    try {
      if (solutionData.code) {
        if (editingSnippetId) {
          await axios.put(`/api/snippets/${editingSnippetId}`, {
            problemName: problemData.title,
            difficulty: problemData.difficulty,
            language: solutionData.language,
            code: solutionData.code,
            runtime: solutionData.runtime,
            memory: solutionData.memory,
            topics: problemData.topicTags.map(t => t.name),
            link: `https://leetcode.com/problems/${problemData.titleSlug}/`
          }, { headers });
        } else {
          await axios.post('/api/snippets', {
            problemName: problemData.title,
            difficulty: problemData.difficulty,
            language: solutionData.language,
            code: solutionData.code,
            runtime: solutionData.runtime,
            memory: solutionData.memory,
            topics: problemData.topicTags.map(t => t.name),
            link: `https://leetcode.com/problems/${problemData.titleSlug}/`
          }, { headers });
        }
      }
      
      if (solutionData.notes) {
        if (editingNoteId) {
          await axios.put(`/api/notes/${editingNoteId}`, {
            problemName: problemData.title,
            difficulty: problemData.difficulty,
            content: solutionData.notes,
            personalRating: solutionData.personalRating,
            topics: problemData.topicTags.map(t => t.name)
          }, { headers });
        } else {
          await axios.post('/api/notes', {
            problemName: problemData.title,
            difficulty: problemData.difficulty,
            content: solutionData.notes,
            personalRating: solutionData.personalRating,
            topics: problemData.topicTags.map(t => t.name)
          }, { headers });
        }
      }
      
      showToast(editingSnippetId || editingNoteId ? 'Solution updated!' : 'Solution saved!', 'success');
      setShowModal(false);
      resetForm();
      fetchSolutions();
    } catch (e) {
      showToast('Failed to save', 'error');
    }
  };

  const handleView = async (solution) => {
    try {
      const titleSlug = extractTitleSlug(solution.problemName);
      const response = await axios.post('/api/leetcode/problem', { titleSlug }, { headers });
      setViewingSolution({ ...solution, problemDetails: response.data });
      setShowViewModal(true);
    } catch (error) {
      setViewingSolution(solution);
      setShowViewModal(true);
    }
  };

  const handleEdit = async (solution) => {
    try {
      const titleSlug = solution.snippet?.link ? 
        extractTitleSlug(solution.snippet.link) : 
        extractTitleSlug(solution.problemName);
      const response = await axios.post('/api/leetcode/problem', { titleSlug }, { headers });
      setProblemData(response.data);
    } catch (error) {
      showToast('Could not load problem details', 'error');
      return;
    }

    setSolutionData({
      code: solution.snippet?.code || '',
      language: solution.snippet?.language || 'Python',
      runtime: solution.snippet?.runtime || '',
      memory: solution.snippet?.memory || '',
      notes: solution.note?.content || '',
      personalRating: solution.note?.personalRating || 3
    });
    setEditingSnippetId(solution.snippet?._id || null);
    setEditingNoteId(solution.note?._id || null);
    setShowModal(true);
  };

  const handleDelete = async (solution) => {
    if (!window.confirm(`Delete solution for ${solution.problemName}?`)) return;
    try {
      if (solution.snippet) {
        await axios.delete(`/api/snippets/${solution.snippet._id}`, { headers });
      }
      if (solution.note) {
        await axios.delete(`/api/notes/${solution.note._id}`, { headers });
      }
      showToast('Solution deleted', 'info');
      fetchSolutions();
    } catch (e) {
      showToast('Failed to delete', 'error');
    }
  };

  const resetForm = () => {
    setProblemInput('');
    setProblemData(null);
    setEditingSnippetId(null);
    setEditingNoteId(null);
    setSolutionData({ code: '', language: 'Python', runtime: '', memory: '', notes: '', personalRating: 3 });
  };

  return (
    <div>
      <button className="pixel-button primary" style={{ marginBottom: '20px' }} onClick={() => { resetForm(); setShowModal(true); }}>
        <Code size={14} /> NEW SOLUTION
      </button>

      {loading ? (
        <div className="empty-state">Loading...</div>
      ) : solutions.length === 0 ? (
        <div className="empty-state">
          <Code size={48} style={{ opacity: 0.3, marginBottom: '16px' }} />
          <h3>No solutions yet!</h3>
          <p>Add your first solution by clicking NEW SOLUTION above</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {solutions.map((sol, idx) => (
            <div key={idx} className="snippet-card">
              <div className="snippet-header">
                <div>
                  <h3>{sol.problemName}</h3>
                  <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                    <span className={`difficulty-badge ${sol.difficulty?.toLowerCase()}`}>{sol.difficulty}</span>
                    {sol.snippet && <span className="lang-badge">{sol.snippet.language}</span>}
                    {sol.topics?.slice(0, 3).map(t => <span key={t} className="topic-tag">{t}</span>)}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button className="pixel-button primary" style={{ fontSize: '11px', padding: '6px 12px' }} onClick={() => handleView(sol)}>View</button>
                  <button className="pixel-button" style={{ fontSize: '11px', padding: '6px 12px' }} onClick={() => handleEdit(sol)}>Edit</button>
                  <button className="pixel-button" style={{ fontSize: '11px', padding: '6px 12px' }} onClick={() => handleDelete(sol)}>Delete</button>
                </div>
              </div>
              {sol.snippet && (
                <pre className="code-block" style={{ maxHeight: '200px', overflow: 'auto' }}><code>{sol.snippet.code.substring(0, 300)}{sol.snippet.code.length > 300 ? '...' : ''}</code></pre>
              )}
              {sol.note && (
                <div className="note-content" style={{ marginTop: '12px' }}>{sol.note.content.substring(0, 150)}{sol.note.content.length > 150 ? '...' : ''}</div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => { setShowModal(false); resetForm(); }}>
          <div className="modal-content modal-large" onClick={(e) => e.stopPropagation()} style={{ maxHeight: '90vh', overflow: 'auto' }}>
            <h2>{editingSnippetId || editingNoteId ? 'Edit Solution' : 'New Solution'}</h2>
            
            {!problemData ? (
              <div>
                <div className="form-group">
                  <label>Enter Problem (URL or Name)</label>
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <input 
                      className="pixel-input" 
                      placeholder="e.g. https://leetcode.com/problems/two-sum/ or 'Two Sum'"
                      value={problemInput}
                      onChange={(e) => setProblemInput(e.target.value)}
                      style={{ flex: 1 }}
                    />
                    <button 
                      className="pixel-button primary" 
                      onClick={handleFetchProblem}
                      disabled={fetchingProblem}
                    >
                      {fetchingProblem ? 'LOADING...' : 'FETCH'}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div>
                  <h3>{problemData.title}</h3>
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                    <span className={`difficulty-badge ${problemData.difficulty.toLowerCase()}`}>{problemData.difficulty}</span>
                    {problemData.topicTags.map(t => <span key={t.name} className="topic-tag">{t.name}</span>)}
                  </div>
                  <div style={{ maxHeight: '400px', overflow: 'auto', fontSize: '13px', lineHeight: '1.6' }}
                    dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(problemData.content) }} />
                </div>

                <div>
                  <div className="form-group">
                    <label>Language</label>
                    <input className="pixel-input" value={solutionData.language} 
                      onChange={(e) => setSolutionData({...solutionData, language: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label>Your Solution (optional)</label>
                    <textarea className="pixel-input" rows="8" value={solutionData.code}
                      onChange={(e) => setSolutionData({...solutionData, code: e.target.value})} />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div className="form-group">
                      <label>Runtime</label>
                      <input className="pixel-input" placeholder="e.g. 45ms" value={solutionData.runtime}
                        onChange={(e) => setSolutionData({...solutionData, runtime: e.target.value})} />
                    </div>
                    <div className="form-group">
                      <label>Memory</label>
                      <input className="pixel-input" placeholder="e.g. 14MB" value={solutionData.memory}
                        onChange={(e) => setSolutionData({...solutionData, memory: e.target.value})} />
                    </div>
                  </div>
                  <div className="form-group">
                    <label>Notes (optional)</label>
                    <textarea className="pixel-input" rows="4" value={solutionData.notes}
                      onChange={(e) => setSolutionData({...solutionData, notes: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label>Personal Difficulty</label>
                    <select className="pixel-input" value={solutionData.personalRating}
                      onChange={(e) => setSolutionData({...solutionData, personalRating: Number(e.target.value)})}>
                      <option value="1">★ Very Easy</option>
                      <option value="2">★★ Easy</option>
                      <option value="3">★★★ Medium</option>
                      <option value="4">★★★★ Hard</option>
                      <option value="5">★★★★★ Very Hard</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
              {problemData && (
                <button className="pixel-button primary full-width" onClick={handleSaveSolution}>
                  {editingSnippetId || editingNoteId ? 'UPDATE SOLUTION' : 'SAVE SOLUTION'}
                </button>
              )}
              <button className="pixel-button full-width" onClick={() => { setShowModal(false); resetForm(); }}>
                CANCEL
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Modal */}
      {showViewModal && viewingSolution && (
        <div className="modal-overlay" onClick={() => setShowViewModal(false)}>
          <div className="modal-content modal-large" onClick={(e) => e.stopPropagation()} style={{ maxHeight: '90vh', overflow: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2>{viewingSolution.problemName}</h2>
              <button className="pixel-button" onClick={() => setShowViewModal(false)}>✕</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              {/* Problem Description */}
              <div>
                <h3 style={{ marginBottom: '12px' }}>Problem</h3>
                {viewingSolution.problemDetails ? (
                  <>
                    <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                      <span className={`difficulty-badge ${viewingSolution.problemDetails.difficulty.toLowerCase()}`}>
                        {viewingSolution.problemDetails.difficulty}
                      </span>
                      {viewingSolution.problemDetails.topicTags.map(t => (
                        <span key={t.name} className="topic-tag">{t.name}</span>
                      ))}
                    </div>
                    <div style={{ maxHeight: '500px', overflow: 'auto', fontSize: '13px', lineHeight: '1.6' }}
                      dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(viewingSolution.problemDetails.content) }} />
                  </>
                ) : (
                  <p style={{ color: 'var(--text-tertiary)' }}>Problem description not available</p>
                )}
              </div>

              {/* Your Solution */}
              <div>
                <h3 style={{ marginBottom: '12px' }}>Your Solution</h3>
                {viewingSolution.snippet && (
                  <>
                    <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                      <span className="lang-badge">{viewingSolution.snippet.language}</span>
                      {viewingSolution.snippet.runtime && <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>⚡ {viewingSolution.snippet.runtime}</span>}
                      {viewingSolution.snippet.memory && <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>💾 {viewingSolution.snippet.memory}</span>}
                    </div>
                    <pre className="code-block" style={{ maxHeight: '300px', overflow: 'auto' }}>
                      <code>{viewingSolution.snippet.code}</code>
                    </pre>
                  </>
                )}
                
                {viewingSolution.note && (
                  <div style={{ marginTop: '20px' }}>
                    <h4 style={{ marginBottom: '8px' }}>Notes</h4>
                    {viewingSolution.note.personalRating && (
                      <div style={{ marginBottom: '8px' }}>
                        <span style={{ fontSize: '14px' }}>{'★'.repeat(viewingSolution.note.personalRating)}</span>
                      </div>
                    )}
                    <div className="note-content">{viewingSolution.note.content}</div>
                    {viewingSolution.note.resources?.length > 0 && (
                      <div className="note-resources" style={{ marginTop: '12px' }}>
                        <strong>Resources:</strong>
                        <ul>{viewingSolution.note.resources.map((r, i) => (
                          <li key={i}><a href={r} target="_blank" rel="noopener noreferrer">{r}</a></li>
                        ))}</ul>
                      </div>
                    )}
                  </div>
                )}

                {!viewingSolution.snippet && !viewingSolution.note && (
                  <p style={{ color: 'var(--text-tertiary)' }}>No solution saved yet</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


export default App;