import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import Toast from './components/Toast';
import Login from './components/Login';
import LandingPage from './components/LandingPage';
import AuthChoice from './components/AuthChoice';
import SignUp from './components/SignUp';
import EmailVerify from './components/EmailVerify';
import Dashboard from './components/Dashboard';
import ForgotPassword from './components/ForgotPassword';
import NotFound from './components/NotFound';
import PageTransition from './components/PageTransition';
import LoadingScreen from './components/LoadingScreen';
import useDarkMode from './utils/useDarkMode';
import { API_URL } from './utils/api';
import './styles/App.css';

/* Cursor-following accent glow for non-landing pages */
function CursorGlow() {
  const ref = useRef(null);
  useEffect(() => {
    let raf = 0;
    let mx = window.innerWidth / 2;
    let my = window.innerHeight / 2;
    const apply = () => {
      raf = 0;
      const el = ref.current;
      if (el) {
        el.style.setProperty('--mx', `${mx}px`);
        el.style.setProperty('--my', `${my}px`);
      }
    };
    const onMove = (e) => {
      mx = e.clientX;
      my = e.clientY;
      if (!raf) raf = requestAnimationFrame(apply);
    };
    apply();
    window.addEventListener('mousemove', onMove, { passive: true });
    return () => {
      window.removeEventListener('mousemove', onMove);
      cancelAnimationFrame(raf);
    };
  }, []);
  return <div className="app-cursor-glow" ref={ref} aria-hidden="true" />;
}

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
  const [toasts, setToasts] = useState([]);
  const [dark, setDark] = useDarkMode();
  const toastSeq = useRef(0);

  // showToast is passed into effect dependency lists further down the tree
  // (Leaderboard, for one). Recreating it on every render made those effects
  // re-run on every toast, which could loop: fetch -> error toast -> re-render
  // -> fetch. useCallback pins the identity.
  const showToast = useCallback((message, type = 'success') => {
    // Date.now() collides when two toasts fire in the same millisecond, and
    // React then warns about duplicate keys.
    const id = `${Date.now()}-${toastSeq.current++}`;
    setToasts(prev => [...prev, { id, message, type }]);
  }, []);
  const removeToast = useCallback(
    (id) => setToasts(prev => prev.filter(t => t.id !== id)),
    []
  );

  const changeView = useCallback((newView) => {
    setTransitioning(true);
    localStorage.setItem('currentView', newView);
    setTimeout(() => { setView(newView); setError(''); setTransitioning(false); }, 300);
  }, []);

  useEffect(() => {
    const initializeApp = async () => {
      if (token) {
        try {
          const response = await axios.get(`${API_URL}/users/me`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          setCurrentUser(response.data);
          const savedView = localStorage.getItem('currentView');
          const authViews = ['dashboard'];
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
  }, [token, changeView]);

  const handleLogout = useCallback(async () => {
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
  }, [token, changeView, showToast]);

  if (loading) return <LoadingScreen />;

  const validViews = ['landing', 'auth-choice', 'login', 'forgot-password', 'signup', 'verify-email', 'dashboard'];
  const isValidView = validViews.includes(view);

  // Block access to the dashboard until the user's email is verified.
  const needsVerification = currentUser && currentUser.emailVerified === false;

  return (
    <div className="game-container">
      <a className="skip-link" href="#main-content">Skip to content</a>
      {view !== 'landing' && <CursorGlow />}
      <PageTransition active={transitioning} />
      {/*
        Toasts carry the only confirmation of a save, and the only report of a
        failure. Without a live region a screen-reader user never learns either
        happened. "polite" so it waits for a pause rather than interrupting.
      */}
      <div
        style={{ position: 'fixed', top: 0, right: 0, zIndex: 10000 }}
        role="status"
        aria-live="polite"
        aria-atomic="false"
      >
        {toasts.map(toast => (
          <Toast key={toast.id} message={toast.message} type={toast.type} onClose={() => removeToast(toast.id)} />
        ))}
      </div>
      <main id="main-content">
      {view === 'landing' && <LandingPage onNavigate={changeView} />}
      {view === 'auth-choice' && <AuthChoice onNavigate={changeView} />}
      {view === 'login' && <Login onNavigate={changeView} setToken={setToken} setCurrentUser={setCurrentUser} showToast={showToast} />}
      {view === 'forgot-password' && <ForgotPassword onNavigate={changeView} showToast={showToast} />}
      {view === 'signup' && <SignUp onNavigate={changeView} setToken={setToken} setCurrentUser={setCurrentUser} setError={setError} error={error} showToast={showToast} />}
      {view === 'verify-email' && currentUser && <EmailVerify onNavigate={changeView} currentUser={currentUser} setCurrentUser={setCurrentUser} onLogout={handleLogout} showToast={showToast} />}
      {view === 'dashboard' && currentUser && needsVerification && <EmailVerify onNavigate={changeView} currentUser={currentUser} setCurrentUser={setCurrentUser} onLogout={handleLogout} showToast={showToast} />}
      {view === 'dashboard' && currentUser && !needsVerification && <Dashboard user={currentUser} setUser={setCurrentUser} onNavigate={changeView} onLogout={handleLogout} showToast={showToast} dark={dark} setDark={setDark} />}
      {!isValidView && <NotFound onNavigate={changeView} />}
      </main>
    </div>
  );
}

export default App;
