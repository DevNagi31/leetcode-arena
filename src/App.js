import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Trophy, 
  Zap, 
  Home, 
  LogOut, 
  Search, 
  RefreshCw, 
  Edit, 
  Lock,
  BarChart3,
  User,
  Globe,
  Building2,
  BookOpen,
  Code,
  Users,
  FileText,
  TrendingUp,
  Target,
  Calendar,
  UserPlus
} from 'lucide-react';
import Toast from './components/Toast';
import Login from './components/Login';
import ProfileEdit from './components/ProfileEdit';
import PasswordChange from './components/PasswordChange';
import ConfirmDialog from './components/ConfirmDialog';
import './styles/App.css';

const API_URL = 'https://leetcode-arena-production.up.railway.app/api';

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

  const removeToast = (id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

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
          console.error('Auth error:', error);
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
    setTimeout(() => {
      setView(newView);
      setError('');
      setTransitioning(false);
    }, 300);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setCurrentUser(null);
    changeView('landing');
    showToast('Logged out successfully', 'info');
  };

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <div className="game-container">
      <PageTransition active={transitioning} />
      
      <div style={{ position: 'fixed', top: 0, right: 0, zIndex: 10000 }}>
        {toasts.map(toast => (
          <Toast
            key={toast.id}
            message={toast.message}
            type={toast.type}
            onClose={() => removeToast(toast.id)}
          />
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
      <div className="pixel-logo">
        <div className="pixel-text">LOADING</div>
      </div>
      <div className="loading-bar">
        <div className="loading-progress"></div>
      </div>
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
        <div className="feature-item">
          <TrendingUp size={20} />
          <span>Track your coding activity</span>
        </div>
        <div className="feature-item">
          <Target size={20} />
          <span>Identify weak areas & improve</span>
        </div>
        <div className="feature-item">
          <Trophy size={20} />
          <span>Compete with your university</span>
        </div>
        <div className="feature-item">
          <Users size={20} />
          <span>Connect with fellow coders</span>
        </div>
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
      const response = await axios.post(`${API_URL}/auth/verify-leetcode`, {
        leetcodeUsername: leetcodeUsername.trim()
      });
      
      localStorage.setItem('tempLeetCodeData', JSON.stringify(response.data));
      showToast('LeetCode account verified!', 'success');
      onNavigate('education-info');
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to connect';
      const alreadyExists = error.response?.data?.alreadyExists;
      setError(`ERROR: ${errorMessage}`);
      showToast(errorMessage, 'error');
      if (alreadyExists && error.response?.status === 409) {
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
          <input
            type="text"
            className="pixel-input"
            placeholder="Enter your LeetCode username"
            value={leetcodeUsername}
            onChange={(e) => setLeetcodeUsername(e.target.value)}
            required
          />
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
        <ConfirmDialog
          message={confirmMessage}
          onConfirm={() => { setShowConfirm(false); onNavigate('login'); }}
          onCancel={() => setShowConfirm(false)}
        />
      )}
    </div>
  );
}

function EducationInfo({ onNavigate, setToken, setCurrentUser, setError, error, showToast }) {
  const [formData, setFormData] = useState({
    username: '', email: '', password: '', country: '',
    educationLevel: '', institutionName: '', year: ''
  });
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
    if (formData.country && formData.institutionName.length >= 2) {
      searchUniversities(formData.institutionName);
    }
  }, [formData.institutionName, formData.country]);

  const fetchCountries = async () => {
    try {
      const response = await axios.get(`${API_URL}/universities/countries`);
      setCountries(response.data);
    } catch (error) { console.error('Failed to fetch countries'); }
  };

  const searchUniversities = async (name) => {
    if (!formData.country) return;
    try {
      const response = await axios.get(`${API_URL}/universities/search`, {
        params: { name, country: formData.country }
      });
      setUniversities(response.data);
    } catch (error) { console.error('Failed to search universities'); }
  };

  const checkPasswordStrength = (password) => {
    let score = 0;
    if (password.length === 0) return { score: 0, message: '', color: 'var(--text-tertiary)' };
    if (password.length < 8) return { score: 1, message: 'Too short (min 8 characters)', color: 'var(--text-primary)' };
    score++;
    if (/[a-z]/.test(password)) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/\d/.test(password)) score++;
    if (/[^a-zA-Z\d]/.test(password)) score++;
    const messages = {
      1: { message: 'Weak', color: 'var(--text-primary)' },
      2: { message: 'Fair', color: 'var(--text-primary)' },
      3: { message: 'Moderate', color: 'var(--text-secondary)' },
      4: { message: 'Good', color: 'var(--text-secondary)' },
      5: { message: 'Strong', color: 'var(--text-primary)' }
    };
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
      const response = await axios.post(`${API_URL}/auth/register`, {
        ...formData,
        leetcodeUsername: leetcodeData.username,
        leetcodeData: leetcodeData
      });
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
              <div style={{ fontSize: '10px', color: passwordStrength.color, marginBottom: '6px', fontWeight: 700 }}>
                {passwordStrength.message}
              </div>
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
            {countries.map(country => <option key={country} value={country}>{country}</option>)}
          </select>
        </div>
        {formData.country && (
          <div className="form-group">
            <label>INSTITUTION</label>
            {!showCustomInput ? (
              <>
                <input type="text" className="pixel-input" placeholder="Start typing to search..."
                  value={formData.institutionName}
                  onChange={(e) => setFormData({...formData, institutionName: e.target.value})}
                  id="institution-search" name="institutionName"
                  list="universities" required />
                <datalist id="universities">
                  {universities.map((uni, idx) => <option key={idx} value={uni.name}>{uni.name}</option>)}
                </datalist>
                <button type="button" className="link-button"
                  onClick={() => setShowCustomInput(true)}
                  style={{ marginTop: '8px', fontSize: '12px' }}>
                  Can't find your school? Add manually
                </button>
              </>
            ) : (
              <>
                <input type="text" className="pixel-input" placeholder="Enter institution name"
                  value={formData.institutionName}
                  onChange={(e) => setFormData({...formData, institutionName: e.target.value})} required />
                <button type="button" className="link-button"
                  onClick={() => setShowCustomInput(false)}
                  style={{ marginTop: '8px', fontSize: '12px' }}>
                  ← Back to search
                </button>
              </>
            )}
          </div>
        )}
        <div className="form-group">
          <label>EDUCATION LEVEL</label>
          <select className="pixel-input" value={formData.educationLevel}
            onChange={(e) => setFormData({...formData, educationLevel: e.target.value, year: ''})} required>
            <option value="">Select</option>
            {educationLevels.map(level => <option key={level} value={level}>{level}</option>)}
          </select>
        </div>
        {formData.educationLevel && (
          <div className="form-group">
            <label>YEAR</label>
            <select className="pixel-input" value={formData.year}
              onChange={(e) => setFormData({...formData, year: e.target.value})} required>
              <option value="">Select</option>
              {yearOptions[formData.educationLevel]?.map(year => <option key={year} value={year}>{year}</option>)}
            </select>
          </div>
        )}
        <button type="submit" className="pixel-button primary full-width"
          disabled={submitting || passwordStrength.score < 3}>
          {submitting ? 'CREATING ACCOUNT...' : 'JOIN CODE MANAGER'}
        </button>
      </form>
    </div>
  );
}

function Dashboard({ user, setUser, onNavigate, onLogout, showToast }) {
  const [refreshing, setRefreshing] = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    const autoRefresh = async () => {
      try {
        const response = await axios.post(`${API_URL}/users/refresh-stats`, {}, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        setUser(response.data.user);
      } catch (error) {
        console.error('Auto-refresh failed:', error);
      }
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
    } catch (error) {
      showToast('Failed to refresh stats', 'error');
    } finally {
      setRefreshing(false);
    }
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

  // Topic distribution (placeholder until we build full tracking)
  const topics = [
    { name: 'Arrays', count: Math.floor((user.easy || 0) * 0.4), color: '#4CAF50' },
    { name: 'Strings', count: Math.floor((user.easy || 0) * 0.3), color: '#2196F3' },
    { name: 'Dynamic Programming', count: Math.floor((user.medium || 0) * 0.2), color: '#FF9800' },
    { name: 'Trees', count: Math.floor((user.medium || 0) * 0.25), color: '#9C27B0' },
    { name: 'Graphs', count: Math.floor((user.hard || 0) * 0.3), color: '#F44336' },
    { name: 'Linked Lists', count: Math.floor((user.easy || 0) * 0.2), color: '#00BCD4' },
  ];

  const totalTopicProblems = topics.reduce((sum, t) => sum + t.count, 0) || 1;
  const weakestTopic = topics.reduce((min, t) => t.count < min.count ? t : min, topics[0]);

  return (
    <div className="dashboard">
      {/* Header */}
      <div className="dashboard-header">
        <div className="user-info">
          <div className="user-avatar">
            <User size={32} strokeWidth={2} />
          </div>
          <div>
            <h2>{user.username}</h2>
            <p><Globe size={12} style={{ display: 'inline', marginRight: '4px' }} />{user.country}</p>
            <p><Building2 size={12} style={{ display: 'inline', marginRight: '4px' }} />{user.institutionName} • {user.year}</p>
            <p style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>LeetCode: {user.leetcodeUsername}</p>
          </div>
        </div>
        <div className="header-actions">
          <button className="pixel-button" onClick={() => setShowEditProfile(true)}>
            <Edit size={14} /> EDIT
          </button>
          <button className="pixel-button" onClick={() => setShowChangePassword(true)}>
            <Lock size={14} /> PASSWORD
          </button>
          <button className="pixel-button" onClick={handleRefreshStats} disabled={refreshing}>
            <RefreshCw size={14} className={refreshing ? 'spinning' : ''} />
            {refreshing ? 'SYNCING...' : 'SYNC'}
          </button>
          <button className="pixel-button" onClick={() => onNavigate('leaderboard')}>
            <Trophy size={14} /> LEADERBOARD
          </button>
          <button className="pixel-button secondary" onClick={onLogout}>
            <LogOut size={14} /> LOGOUT
          </button>
        </div>
      </div>

      {/* Nav Tabs */}
      <div className="dashboard-tabs">
        <button className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}>
          <BarChart3 size={16} /> Overview
        </button>
        <button className={`tab-btn ${activeTab === 'tracker' ? 'active' : ''}`}
          onClick={() => setActiveTab('tracker')}>
          <Calendar size={16} /> Tracker
          <span className="coming-soon-badge">Soon</span>
        </button>
        <button className={`tab-btn ${activeTab === 'snippets' ? 'active' : ''}`}
          onClick={() => setActiveTab('snippets')}>
          <Code size={16} /> Snippets
          <span className="coming-soon-badge">Soon</span>
        </button>
        <button className={`tab-btn ${activeTab === 'notes' ? 'active' : ''}`}
          onClick={() => setActiveTab('notes')}>
          <FileText size={16} /> Notes
          <span className="coming-soon-badge">Soon</span>
        </button>
        <button className={`tab-btn ${activeTab === 'friends' ? 'active' : ''}`}
          onClick={() => setActiveTab('friends')}>
          <Users size={16} /> Friends
          <span className="coming-soon-badge">Soon</span>
        </button>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <>
          {/* Stats Grid */}
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-icon"><BarChart3 size={32} strokeWidth={2} /></div>
              <div className="stat-value">{user.problems || 0}</div>
              <div className="stat-label">TOTAL SOLVED</div>
            </div>
            <div className="stat-card">
              <div className="stat-icon" style={{ color: '#4CAF50' }}>E</div>
              <div className="stat-value">{user.easy || 0}</div>
              <div className="stat-label">EASY</div>
            </div>
            <div className="stat-card">
              <div className="stat-icon" style={{ color: '#FF9800' }}>M</div>
              <div className="stat-value">{user.medium || 0}</div>
              <div className="stat-label">MEDIUM</div>
            </div>
            <div className="stat-card">
              <div className="stat-icon" style={{ color: '#F44336' }}>H</div>
              <div className="stat-value">{user.hard || 0}</div>
              <div className="stat-label">HARD</div>
            </div>
          </div>

          {/* Difficulty Progress Bars */}
          <div className="section-card">
            <h3 className="section-title">
              <TrendingUp size={18} /> Difficulty Breakdown
            </h3>
            <div className="difficulty-bars">
              {[
                { label: 'Easy', count: user.easy || 0, total: user.problems || 1, color: '#4CAF50' },
                { label: 'Medium', count: user.medium || 0, total: user.problems || 1, color: '#FF9800' },
                { label: 'Hard', count: user.hard || 0, total: user.problems || 1, color: '#F44336' }
              ].map(({ label, count, total, color }) => (
                <div key={label} className="difficulty-bar-row">
                  <span className="difficulty-label" style={{ color }}>{label}</span>
                  <div className="difficulty-bar-track">
                    <div className="difficulty-bar-fill"
                      style={{ width: `${(count / total) * 100}%`, background: color }} />
                  </div>
                  <span className="difficulty-count">{count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Topic Coverage */}
          <div className="section-card">
            <h3 className="section-title">
              <Target size={18} /> Topic Coverage
              <span style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginLeft: '8px', fontWeight: 400 }}>
                (estimated based on your solving patterns)
              </span>
            </h3>
            <div className="topic-bars">
              {topics.map(({ name, count, color }) => (
                <div key={name} className="topic-bar-row">
                  <span className="topic-label">{name}</span>
                  <div className="topic-bar-track">
                    <div className="topic-bar-fill"
                      style={{ width: `${(count / Math.max(...topics.map(t => t.count), 1)) * 100}%`, background: color }} />
                  </div>
                  <span className="topic-count">{count}</span>
                </div>
              ))}
            </div>
            <div className="focus-suggestion">
              <Target size={14} />
              <span>Focus suggestion: Solve more <strong>{weakestTopic.name}</strong> problems to improve your coverage</span>
            </div>
          </div>

          {/* Leaderboard Rank */}
          <div className="section-card">
            <h3 className="section-title">
              <Trophy size={18} /> Your Rankings
            </h3>
            <div className="rankings-grid">
              <div className="ranking-item">
                <Globe size={16} />
                <span>Global</span>
                <strong>#{user.rank || '-'}</strong>
              </div>
              <div className="ranking-item">
                <span>🌍</span>
                <span>{user.country}</span>
                <strong>-</strong>
              </div>
              <div className="ranking-item">
                <Building2 size={16} />
                <span>{user.institutionName?.split(' ').slice(0, 2).join(' ')}</span>
                <strong>-</strong>
              </div>
            </div>
            <button className="pixel-button primary full-width" style={{ marginTop: '16px' }}
              onClick={() => onNavigate('leaderboard')}>
              <Trophy size={14} /> VIEW FULL LEADERBOARD
            </button>
          </div>

          {/* Coming Soon Features */}
          <div className="section-card coming-soon-section">
            <h3 className="section-title">🚀 Coming Soon</h3>
            <div className="coming-soon-grid">
              <div className="coming-soon-item">
                <Calendar size={20} />
                <span>Daily Coding Tracker</span>
                <p>GitHub-style activity heatmap</p>
              </div>
              <div className="coming-soon-item">
                <Code size={20} />
                <span>Code Snippets</span>
                <p>Save your solutions</p>
              </div>
              <div className="coming-soon-item">
                <FileText size={20} />
                <span>Problem Notes</span>
                <p>Notes per problem</p>
              </div>
              <div className="coming-soon-item">
                <Users size={20} />
                <span>Friends & Chat</span>
                <p>Connect with coders</p>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Coming Soon Tabs */}
      {activeTab !== 'overview' && (
        <div className="coming-soon-page">
          <div className="coming-soon-icon">
            {activeTab === 'tracker' && <Calendar size={64} />}
            {activeTab === 'snippets' && <Code size={64} />}
            {activeTab === 'notes' && <FileText size={64} />}
            {activeTab === 'friends' && <Users size={64} />}
          </div>
          <h2>Coming Soon!</h2>
          <p>This feature is currently being built.</p>
          <button className="pixel-button primary" onClick={() => setActiveTab('overview')}>
            ← Back to Overview
          </button>
        </div>
      )}

      {showEditProfile && (
        <ProfileEdit user={user} onSave={handleSaveProfile}
          onCancel={() => setShowEditProfile(false)} showToast={showToast} />
      )}
      {showChangePassword && (
        <PasswordChange onSave={handleChangePassword}
          onCancel={() => setShowChangePassword(false)} showToast={showToast} />
      )}
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

  useEffect(() => {
    fetchLeaderboard();
    fetchCountries();
  }, [selectedCountry, selectedInstitution]);

  useEffect(() => {
    if (selectedCountry && selectedCountry !== 'all') {
      fetchInstitutions(selectedCountry);
    }
  }, [selectedCountry]);

  const fetchLeaderboard = async () => {
    setLoading(true);
    try {
      const params = {};
      if (selectedCountry !== 'all') params.country = selectedCountry;
      if (selectedInstitution !== 'all') params.institution = selectedInstitution;
      const response = await axios.get(`${API_URL}/leaderboard`, { params });
      setUsers(response.data || []);
    } catch (error) {
      showToast('Failed to load leaderboard', 'error');
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchCountries = async () => {
    try {
      const response = await axios.get(`${API_URL}/leaderboard/countries`);
      setCountries(response.data || []);
    } catch (error) { console.error('Failed to fetch countries'); }
  };

  const fetchInstitutions = async (country) => {
    try {
      const params = country !== 'all' ? { country } : {};
      const response = await axios.get(`${API_URL}/leaderboard/institutions`, { params });
      setInstitutions(response.data || []);
    } catch (error) { console.error('Failed to fetch institutions'); }
  };

  const handleViewChange = (mode) => {
    setViewMode(mode);
    if (mode === 'global') {
      setSelectedCountry('all');
      setSelectedInstitution('all');
    } else if (mode === 'country' && currentUser) {
      setSelectedCountry(currentUser.country);
      setSelectedInstitution('all');
    } else if (mode === 'institution' && currentUser) {
      setSelectedCountry(currentUser.country);
      setSelectedInstitution(currentUser.institutionName);
    }
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
        <button className={`tab-button ${viewMode === 'global' ? 'active' : ''}`}
          onClick={() => handleViewChange('global')}>
          <Globe size={16} /> GLOBAL
        </button>
        {currentUser && (
          <>
            <button className={`tab-button ${viewMode === 'country' ? 'active' : ''}`}
              onClick={() => handleViewChange('country')}>
              🌍 MY COUNTRY
            </button>
            <button className={`tab-button ${viewMode === 'institution' ? 'active' : ''}`}
              onClick={() => handleViewChange('institution')}>
              <Building2 size={16} /> MY UNIVERSITY
            </button>
          </>
        )}
      </div>

      {users.length === 0 ? (
        <div className="empty-message">No users yet</div>
      ) : (
        <>
          <div className="filter-section">
            <div className="search-bar">
              <Search size={18} />
              <input type="text" className="search-input pixel-input" placeholder="Search..."
                value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
            </div>
            <div className="college-filter">
              <label>Country:</label>
              <select value={selectedCountry} onChange={(e) => {
                setSelectedCountry(e.target.value);
                setSelectedInstitution('all');
              }}>
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
              const placeLabels = ['🥇', '🥈', '🥉'];
              if (!user) {
                return (
                  <div key={`empty-${place}`} className={`podium-place place-${place}`}>
                    <div className="podium-rank">{placeLabels[place - 1]}</div>
                    <div className="podium-avatar"><User size={32} /></div>
                    <div className="podium-name">Empty</div>
                    <div className="podium-score">- pts</div>
                    <div className="podium-college">-</div>
                  </div>
                );
              }
              return (
                <div key={user._id} className={`podium-place place-${place}`}>
                  <div className="podium-rank">{placeLabels[place - 1]}</div>
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
                <div>RANK</div><div>USER</div><div>COUNTRY</div>
                <div>INSTITUTION</div><div>PROBLEMS</div><div>SCORE</div>
              </div>
              {restUsers.map((user, index) => (
                <div key={user._id} className="table-row">
                  <div className="table-cell"><span className="rank-badge">#{index + 4}</span></div>
                  <div className="table-cell">
                    <span className="user-avatar-small"><User size={14} /></span>
                    {user.username}
                  </div>
                  <div className="table-cell">{user.country}</div>
                  <div className="table-cell">{user.institutionName}</div>
                  <div className="table-cell">{user.problems}</div>
                  <div className="table-cell">{user.score}</div>
                </div>
              ))}
            </div>
          )}

          {filteredUsers.length === 0 && users.length > 0 && (
            <div className="empty-message">No results found</div>
          )}
        </>
      )}
    </div>
  );
}

export default App;