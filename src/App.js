import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Moon, Sun } from 'lucide-react';
import Toast from './components/Toast';
import Login from './components/Login';
import LandingPage from './components/LandingPage';
import AuthChoice from './components/AuthChoice';
import LeetCodeConnect from './components/LeetCodeConnect';
import EducationInfo from './components/EducationInfo';
import Dashboard from './components/Dashboard';
import Leaderboard from './components/Leaderboard';
import ForgotPassword from './components/ForgotPassword';
import NotFound from './components/NotFound';
import PageTransition from './components/PageTransition';
import LoadingScreen from './components/LoadingScreen';
import useDarkMode from './utils/useDarkMode';
import { API_URL } from './utils/api';
import './styles/App.css';

function App() {
  const [view, setView] = useState(() => {
    const saved = localStorage.getItem('currentView');
    return saved || 'landing';
  });
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [transitioning, setTransitioning] = useState(false);
  const [users, setUsers] = useState([]);
  const [toasts, setToasts] = useState([]);
  const [dark, setDark] = useDarkMode();

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
          const savedView = localStorage.getItem('currentView');
          const authViews = ['dashboard', 'leaderboard'];
          if (savedView && authViews.includes(savedView)) {
            setView(savedView);
          } else {
            changeView('dashboard');
          }
        } catch (error) {
          localStorage.removeItem('token');
          localStorage.removeItem('currentView');
          setToken(null);
        }
      } else {
        localStorage.removeItem('currentView');
      }
      setLoading(false);
    };
    initializeApp();
  }, [token]);

  const changeView = (newView) => {
    setTransitioning(true);
    localStorage.setItem('currentView', newView);
    setTimeout(() => { setView(newView); setError(''); setTransitioning(false); }, 300);
  };

  const handleLogout = async () => {
    try {
      await axios.post(`${API_URL}/auth/logout`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
    } catch (e) { /* silently fail */ }
    localStorage.removeItem('token');
    localStorage.removeItem('currentView');
    setToken(null);
    setCurrentUser(null);
    changeView('landing');
    showToast('Logged out successfully', 'info');
  };

  if (loading) return <LoadingScreen />;

  const validViews = ['landing', 'auth-choice', 'login', 'forgot-password', 'leetcode-connect', 'education-info', 'dashboard', 'leaderboard'];
  const isValidView = validViews.includes(view);

  return (
    <div className="game-container">
      <PageTransition active={transitioning} />
      <button className="theme-toggle" onClick={() => setDark(!dark)} title={dark ? 'Switch to light mode' : 'Switch to dark mode'}>
        {dark ? <Sun size={18} /> : <Moon size={18} />}
      </button>
      <div style={{ position: 'fixed', top: 0, right: 0, zIndex: 10000 }}>
        {toasts.map(toast => (
          <Toast key={toast.id} message={toast.message} type={toast.type} onClose={() => removeToast(toast.id)} />
        ))}
      </div>
      {view === 'landing' && <LandingPage onNavigate={changeView} />}
      {view === 'auth-choice' && <AuthChoice onNavigate={changeView} />}
      {view === 'login' && <Login onNavigate={changeView} setToken={setToken} setCurrentUser={setCurrentUser} showToast={showToast} />}
      {view === 'forgot-password' && <ForgotPassword onNavigate={changeView} showToast={showToast} />}
      {view === 'leetcode-connect' && <LeetCodeConnect onNavigate={changeView} setError={setError} error={error} showToast={showToast} />}
      {view === 'education-info' && <EducationInfo onNavigate={changeView} setToken={setToken} setCurrentUser={setCurrentUser} setError={setError} error={error} showToast={showToast} />}
      {view === 'dashboard' && currentUser && <Dashboard user={currentUser} setUser={setCurrentUser} onNavigate={changeView} onLogout={handleLogout} showToast={showToast} />}
      {view === 'leaderboard' && <Leaderboard users={users} setUsers={setUsers} onNavigate={changeView} currentUser={currentUser} showToast={showToast} />}
      {!isValidView && <NotFound onNavigate={changeView} />}
    </div>
  );
}

export default App;
