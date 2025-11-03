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
  Target,
  Flame,
  Crown,
  Gem,
  BarChart3,
  Award,
  User,
  Medal,
  TrendingUp
} from 'lucide-react';
import Toast from './components/Toast';
import Login from './components/Login';
import ProfileEdit from './components/ProfileEdit';
import PasswordChange from './components/PasswordChange';
import ConfirmDialog from './components/ConfirmDialog';
import './styles/App.css';

const API_URL = 'https://leetcode-arena-production.up.railway.app';

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
    }, 600);
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
      <div className="loading-text">INITIALIZING ARENA</div>
    </div>
  );
}

function LandingPage({ onNavigate }) {
  return (
    <div className="landing-page">
      <div className="game-title">
        <span className="title-line">LEETCODE</span>
        <span className="title-line">ARENA</span>
      </div>
      <div className="game-subtitle">BATTLE ROYALE</div>
      <div className="game-tagline">COMPETE • LEVEL UP • DOMINATE</div>
      
      <div className="menu-options">
        <button className="pixel-button primary" onClick={() => onNavigate('leetcode-connect')}>
          <Zap size={18} strokeWidth={2.5} /> START QUEST
        </button>
        <button className="pixel-button" onClick={() => onNavigate('login')}>
          <Lock size={18} strokeWidth={2.5} /> LOGIN
        </button>
        <button className="pixel-button secondary" onClick={() => onNavigate('leaderboard')}>
          <Trophy size={18} strokeWidth={2.5} /> LEADERBOARD
        </button>
      </div>
      
      <p className="game-info">COMPETE • LEVEL UP • DOMINATE</p>
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
      showToast('LeetCode account verified', 'success');
      onNavigate('education-info');
    } catch (error) {
      console.error('Verification failed:', error);
      
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
      <button className="back-button" onClick={() => onNavigate('landing')}>← BACK</button>
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
          {verifying ? 'VERIFYING...' : 'CONNECT & CONTINUE'}
        </button>
        
        <div className="form-footer">
          <span style={{ color: 'var(--text-secondary)' }}>Already have an account?</span>
          <button 
            type="button"
            className="link-button" 
            onClick={() => onNavigate('login')}
          >
            LOGIN
          </button>
        </div>
      </form>

      {showConfirm && (
        <ConfirmDialog
          message={confirmMessage}
          onConfirm={() => {
            setShowConfirm(false);
            onNavigate('login');
          }}
          onCancel={() => setShowConfirm(false)}
        />
      )}
    </div>
  );
}

function EducationInfo({ onNavigate, setToken, setCurrentUser, setError, error, showToast }) {
  const [formData, setFormData] = useState({
    username: '', email: '', password: '', educationLevel: '', institutionName: '', year: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState({ score: 0, message: '', color: 'var(--text-tertiary)' });

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
        ...formData, leetcodeUsername: leetcodeData.username, leetcodeData: leetcodeData
      });
      
      localStorage.setItem('token', response.data.token);
      localStorage.removeItem('tempLeetCodeData');
      setToken(response.data.token);
      setCurrentUser(response.data.user);
      showToast('Welcome to the Arena', 'success');
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
      <h2 className="form-title">WARRIOR INFO</h2>
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
              <div style={{ fontSize: '10px', color: passwordStrength.color, marginBottom: '6px', fontWeight: 700, letterSpacing: '0.5px' }}>
                {passwordStrength.message}
              </div>
              <div style={{ height: '3px', background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
                <div style={{ height: '100%', width: `${passwordStrength.score * 20}%`, background: 'var(--text-primary)', transition: 'all 0.3s' }}></div>
              </div>
            </div>
          )}
        </div>
        <div className="form-group">
          <label>EDUCATION LEVEL</label>
          <select className="pixel-input" value={formData.educationLevel}
            onChange={(e) => setFormData({...formData, educationLevel: e.target.value, year: ''})} required>
            <option value="">Select</option>
            {educationLevels.map(level => <option key={level} value={level}>{level}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label>INSTITUTION</label>
          <input type="text" className="pixel-input" placeholder="Your school/university"
            value={formData.institutionName} onChange={(e) => setFormData({...formData, institutionName: e.target.value})} required />
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
        <button type="submit" className="pixel-button primary full-width" disabled={submitting || passwordStrength.score < 3}>
          {submitting ? 'ENTERING...' : 'ENTER ARENA'}
        </button>
      </form>
    </div>
  );
}

function Dashboard({ user, setUser, onNavigate, onLogout, showToast }) {
  const [showDebug, setShowDebug] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);

  if (!user) return <LoadingScreen />;

  const calculateProgress = () => {
    const level = user.level || 1;
    const problems = user.problems || 0;
    const currentLevelXP = (level - 1) * 100;
    const nextLevelXP = level * 100;
    const userXP = problems * 10;
    return ((userXP - currentLevelXP) / (nextLevelXP - currentLevelXP)) * 100;
  };

  const handleRefreshStats = async () => {
    setRefreshing(true);
    try {
      const response = await axios.post(`${API_URL}/users/refresh-stats`, {}, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setUser(response.data.user);
      showToast('Stats refreshed successfully', 'success');
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

  const achievements = [
    { icon: <Target size={40} strokeWidth={2} />, name: 'First Blood', earned: (user.problems || 0) > 0 },
    { icon: <Flame size={40} strokeWidth={2} />, name: 'On Fire', earned: (user.streak || 0) >= 7 },
    { icon: <Zap size={40} strokeWidth={2} />, name: 'Speed Demon', earned: (user.problems || 0) >= 50 },
    { icon: <Crown size={40} strokeWidth={2} />, name: 'Elite', earned: (user.problems || 0) >= 100 },
    { icon: <Gem size={40} strokeWidth={2} />, name: 'Legend', earned: (user.problems || 0) >= 200 },
    { icon: <Trophy size={40} strokeWidth={2} />, name: 'Champion', earned: (user.problems || 0) >= 500 }
  ];

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <div className="user-info">
          <div className="user-avatar">
            <User size={32} strokeWidth={2} />
          </div>
          <div>
            <h2>{user.username}</h2>
            <p>{user.institutionName} • {user.year}</p>
            <p style={{ fontSize: '11px', color: 'var(--text-tertiary)', letterSpacing: '0.3px' }}>
              LeetCode: {user.leetcodeUsername}
            </p>
          </div>
        </div>
        <div className="header-actions">
          <button className="pixel-button" onClick={() => setShowEditProfile(true)}>
            <Edit size={14} strokeWidth={2} /> EDIT
          </button>
          <button className="pixel-button" onClick={() => setShowChangePassword(true)}>
            <Lock size={14} strokeWidth={2} /> PASSWORD
          </button>
          <button className="pixel-button" onClick={handleRefreshStats} disabled={refreshing}>
            <RefreshCw size={14} strokeWidth={2} className={refreshing ? 'spinning' : ''} /> 
            {refreshing ? 'UPDATE' : 'REFRESH'}
          </button>
          <button className="pixel-button" onClick={() => setShowDebug(!showDebug)}>
            <Search size={14} strokeWidth={2} /> {showDebug ? 'HIDE' : 'DEBUG'}
          </button>
          <button className="pixel-button" onClick={() => onNavigate('leaderboard')}>
            <Trophy size={14} strokeWidth={2} /> BOARD
          </button>
          <button className="pixel-button secondary" onClick={onLogout}>
            <LogOut size={14} strokeWidth={2} /> LOGOUT
          </button>
        </div>
      </div>

      {showDebug && (
        <div style={{ 
          background: 'var(--bg-secondary)', 
          border: '2px solid var(--border)', 
          padding: '24px', 
          marginBottom: '24px', 
          fontFamily: 'monospace', 
          fontSize: '12px', 
          color: 'var(--text-primary)',
          letterSpacing: '0.3px'
        }}>
          <div style={{ fontFamily: 'Inter', marginBottom: '12px', fontSize: '14px', fontWeight: 800 }}>DEBUG INFO</div>
          <div><strong>LeetCode:</strong> {user.leetcodeUsername}</div>
          <div><strong>Problems:</strong> {user.problems} (E:{user.easy} M:{user.medium} H:{user.hard})</div>
          <div><strong>Streak:</strong> {user.streak} | <strong>Score:</strong> {user.score} | <strong>Level:</strong> {user.level}</div>
        </div>
      )}

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon"><BarChart3 size={40} strokeWidth={2} /></div>
          <div className="stat-value">{user.problems || 0}</div>
          <div className="stat-label">PROBLEMS</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon"><Zap size={40} strokeWidth={2} /></div>
          <div className="stat-value">{user.score || 0}</div>
          <div className="stat-label">SCORE</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon"><Flame size={40} strokeWidth={2} /></div>
          <div className="stat-value">{user.streak || 0}</div>
          <div className="stat-label">STREAK</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon"><Trophy size={40} strokeWidth={2} /></div>
          <div className="stat-value">#{user.rank || '-'}</div>
          <div className="stat-label">RANK</div>
        </div>
      </div>

      <div className="level-section">
        <div className="level-header">
          <h3>LEVEL {user.level || 1}</h3>
          <span>{(user.problems || 0) * 10} / {(user.level || 1) * 100} XP</span>
        </div>
        <div className="health-bar">
          <div className="health-fill" style={{ width: `${calculateProgress()}%` }}></div>
        </div>
      </div>

      <div className="achievements-section">
        <h3>ACHIEVEMENTS</h3>
        <div className="achievements-grid">
          {achievements.map((achievement, index) => (
            <div key={index} className={`achievement-badge ${achievement.earned ? 'earned' : ''}`}>
              <div className="achievement-icon">{achievement.icon}</div>
              <span>{achievement.name}</span>
            </div>
          ))}
        </div>
      </div>

      {showEditProfile && (
        <ProfileEdit
          user={user}
          onSave={handleSaveProfile}
          onCancel={() => setShowEditProfile(false)}
          showToast={showToast}
        />
      )}

      {showChangePassword && (
        <PasswordChange
          onSave={handleChangePassword}
          onCancel={() => setShowChangePassword(false)}
          showToast={showToast}
        />
      )}
    </div>
  );
}

function Leaderboard({ users, setUsers, onNavigate, currentUser, showToast }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCollege, setSelectedCollege] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await axios.get(`${API_URL}/leaderboard`);
      setUsers(response.data || []);
    } catch (error) {
      showToast('Failed to load leaderboard', 'error');
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter(user => {
    if (!user || !user.username || !user.institutionName) return false;
    const matchesSearch = user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         user.institutionName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCollege = !selectedCollege || user.institutionName === selectedCollege;
    return matchesSearch && matchesCollege;
  });

  const colleges = [...new Set(users.filter(u => u && u.institutionName).map(u => u.institutionName))];
  const getTopThree = () => {
    const top = filteredUsers.slice(0, 3);
    return top.concat(Array(3 - top.length).fill(null));
  };

  const topThree = getTopThree();
  const restUsers = filteredUsers.slice(3);

  if (loading) return <div className="leaderboard"><div className="loading-message">LOADING</div></div>;

  return (
    <div className="leaderboard">
      <div className="leaderboard-header">
        <h2><Trophy className="header-icon" size={32} strokeWidth={2} /> LEADERBOARD</h2>
        <button className="pixel-button" onClick={() => onNavigate(currentUser ? 'dashboard' : 'landing')}>
          <Home size={16} strokeWidth={2} /> {currentUser ? 'DASHBOARD' : 'HOME'}
        </button>
      </div>

      {users.length === 0 ? (
        <div className="empty-message">No warriors yet</div>
      ) : (
        <>
          <div className="filter-section">
            <div className="search-bar">
              <Search size={18} strokeWidth={2} />
              <input type="text" className="search-input pixel-input" placeholder="Search..."
                value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
            </div>
            <div className="college-filter">
              <label>Institution:</label>
              <select value={selectedCollege} onChange={(e) => setSelectedCollege(e.target.value)}>
                <option value="">All</option>
                {colleges.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          <div className="podium">
            {[topThree[1], topThree[0], topThree[2]].map((user, index) => {
              const place = index === 1 ? 1 : index === 0 ? 2 : 3;
              const medals = [
                <Award size={48} strokeWidth={2} />,
                <Medal size={48} strokeWidth={2} />,
                <TrendingUp size={48} strokeWidth={2} />
              ];
              
              if (!user) {
                return (
                  <div key={`empty-${place}`} className={`podium-place place-${place}`}>
                    <div className="podium-rank">{medals[place - 1]}</div>
                    <div className="podium-avatar"><User size={32} strokeWidth={2} /></div>
                    <div className="podium-name">Empty</div>
                    <div className="podium-score">- pts</div>
                    <div className="podium-college">-</div>
                  </div>
                );
              }

              return (
                <div key={user._id} className={`podium-place place-${place}`}>
                  <div className="podium-rank">{medals[place - 1]}</div>
                  <div className="podium-avatar"><User size={32} strokeWidth={2} /></div>
                  <div className="podium-name">{user.username}</div>
                  <div className="podium-score">{user.score} pts</div>
                  <div className="podium-college">{user.institutionName}</div>
                </div>
              );
            })}
          </div>

          {restUsers.length > 0 && (
            <div className="leaderboard-table">
              <div className="table-header">
                <div>RANK</div><div>WARRIOR</div><div>INSTITUTION</div><div>PROBLEMS</div><div>SCORE</div><div>STREAK</div><div>LEVEL</div>
              </div>
              {restUsers.map((user, index) => (
                <div key={user._id} className="table-row">
                  <div className="table-cell"><span className="rank-badge">#{index + 4}</span></div>
                  <div className="table-cell">
                    <span className="user-avatar-small"><User size={16} strokeWidth={2} /></span>
                    {user.username}
                  </div>
                  <div className="table-cell">{user.institutionName}</div>
                  <div className="table-cell">{user.problems}</div>
                  <div className="table-cell">{user.score}</div>
                  <div className="table-cell"><Flame size={16} strokeWidth={2} /> {user.streak}</div>
                  <div className="table-cell"><span className="level-badge">Lv.{user.level}</span></div>
                </div>
              ))}
            </div>
          )}

          {filteredUsers.length === 0 && users.length > 0 && (
            <div className="empty-message">No results</div>
          )}
        </>
      )}
    </div>
  );
}

export default App;
// Trigger rebuild
