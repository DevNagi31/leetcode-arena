import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { HelpCircle } from 'lucide-react';
import { EDUCATION_LEVELS, YEAR_OPTIONS, checkPasswordStrength } from '../utils/constants';
import { API_URL } from '../utils/api';
import ConfirmDialog from './ConfirmDialog';

// Password requirements must mirror the backend (min 8, upper, lower, digit).
const passwordRules = (pw) => ({
  length: pw.length >= 8,
  lower: /[a-z]/.test(pw),
  upper: /[A-Z]/.test(pw),
  digit: /\d/.test(pw),
});
const passwordMeetsRequirements = (pw) => Object.values(passwordRules(pw)).every(Boolean);

export default function SignUp({ onNavigate, setToken, setCurrentUser, setError, error, showToast }) {
  const [formData, setFormData] = useState({
    leetcodeUsername: '', username: '', email: '', password: '',
    country: '', educationLevel: '', institutionName: '', year: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState({ score: 0, message: '', color: 'var(--text-tertiary)' });
  const [countries, setCountries] = useState([]);
  const [universities, setUniversities] = useState([]);
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    const fetchCountries = async () => {
      try { const r = await axios.get(`${API_URL}/universities/countries`); setCountries(r.data); }
      catch (e) { /* silently fail */ }
    };
    fetchCountries();
  }, []);

  useEffect(() => {
    if (!formData.country || formData.institutionName.length < 2) return;
    const searchUniversities = async () => {
      try {
        const r = await axios.get(`${API_URL}/universities/search`, { params: { name: formData.institutionName, country: formData.country } });
        setUniversities(r.data);
      } catch (e) { /* silently fail */ }
    };
    searchUniversities();
  }, [formData.institutionName, formData.country]);

  const handlePasswordChange = (e) => {
    const password = e.target.value;
    setFormData({ ...formData, password });
    setPasswordStrength(checkPasswordStrength(password));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const response = await axios.post(`${API_URL}/auth/register`, {
        ...formData,
        leetcodeUsername: formData.leetcodeUsername.trim()
      });
      localStorage.setItem('token', response.data.token);
      setToken(response.data.token);
      setCurrentUser(response.data.user);
      showToast('Account created! Check your email for a verification code.', 'success');
      // Block until verified: route to the email verification step.
      onNavigate('verify-email');
    } catch (err) {
      const errorMsg = err.response?.data?.message || 'Registration failed';
      setError(errorMsg);
      showToast(errorMsg, 'error');
      // Offer to log in if the LeetCode account is already registered.
      if (/already (linked|registered)/i.test(errorMsg)) {
        setShowConfirm(true);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const rules = passwordRules(formData.password);
  const canSubmit = !submitting && passwordMeetsRequirements(formData.password);

  return (
    <div className="form-container">
      <button className="back-button" onClick={() => onNavigate('auth-choice')}>← BACK</button>
      <h2 className="form-title">CREATE ACCOUNT</h2>
      {error && <div className="error-message">{error}</div>}
      <form className="pixel-form" onSubmit={handleSubmit}>

        <div className="form-group">
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            LEETCODE USERNAME
            <span style={{ position: 'relative', display: 'inline-flex' }}>
              <button
                type="button"
                aria-label="Where do I find my LeetCode username?"
                onClick={() => setShowHelp((v) => !v)}
                onMouseEnter={() => setShowHelp(true)}
                onMouseLeave={() => setShowHelp(false)}
                style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: 'var(--text-secondary)', display: 'inline-flex' }}
              >
                <HelpCircle size={14} strokeWidth={2.5} />
              </button>
              {showHelp && (
                <span style={{
                  position: 'absolute', top: '20px', left: '0', zIndex: 10, width: '240px',
                  background: 'var(--bg-secondary)', border: '1px solid var(--border)',
                  padding: '10px 12px', fontSize: '11px', lineHeight: '1.5',
                  color: 'var(--text-secondary)', boxShadow: '0 4px 12px rgba(0,0,0,0.25)'
                }}>
                  Go to your LeetCode profile — your username is shown right below your name at the top of the page. Enter that exact username here.
                </span>
              )}
            </span>
          </label>
          <input type="text" className="pixel-input" placeholder="Your LeetCode username"
            value={formData.leetcodeUsername}
            onChange={(e) => setFormData({ ...formData, leetcodeUsername: e.target.value })} required />
        </div>

        <div className="form-group">
          <label>USERNAME</label>
          <input type="text" className="pixel-input" placeholder="3-20 characters"
            value={formData.username} onChange={(e) => setFormData({ ...formData, username: e.target.value })} required />
        </div>

        <div className="form-group">
          <label>EMAIL</label>
          <input type="email" className="pixel-input" placeholder="your@email.com"
            value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} required />
        </div>

        <div className="form-group">
          <label>PASSWORD</label>
          <input type="password" className="pixel-input" placeholder="Min 8 chars, upper, lower & number"
            value={formData.password} onChange={handlePasswordChange} required />
          {formData.password && (
            <div style={{ marginTop: '8px' }}>
              <div style={{ fontSize: '10px', color: passwordStrength.color, marginBottom: '6px', fontWeight: 700 }}>{passwordStrength.message}</div>
              <div style={{ height: '3px', background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
                <div style={{ height: '100%', width: `${passwordStrength.score * 20}%`, background: 'var(--text-primary)', transition: 'all 0.3s' }}></div>
              </div>
              <div style={{ marginTop: '6px', fontSize: '10px', color: 'var(--text-secondary)', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                <span style={{ color: rules.length ? 'var(--text-primary)' : 'var(--text-tertiary)' }}>{rules.length ? '✓' : '○'} 8+ chars</span>
                <span style={{ color: rules.upper ? 'var(--text-primary)' : 'var(--text-tertiary)' }}>{rules.upper ? '✓' : '○'} uppercase</span>
                <span style={{ color: rules.lower ? 'var(--text-primary)' : 'var(--text-tertiary)' }}>{rules.lower ? '✓' : '○'} lowercase</span>
                <span style={{ color: rules.digit ? 'var(--text-primary)' : 'var(--text-tertiary)' }}>{rules.digit ? '✓' : '○'} number</span>
              </div>
            </div>
          )}
        </div>

        <div className="form-group">
          <label>COUNTRY</label>
          <select className="pixel-input" value={formData.country}
            onChange={(e) => setFormData({ ...formData, country: e.target.value, institutionName: '' })} required>
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
                  value={formData.institutionName} onChange={(e) => setFormData({ ...formData, institutionName: e.target.value })}
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
                  value={formData.institutionName} onChange={(e) => setFormData({ ...formData, institutionName: e.target.value })} required />
                <button type="button" className="link-button" onClick={() => setShowCustomInput(false)} style={{ marginTop: '8px', fontSize: '12px' }}>← Back to search</button>
              </>
            )}
          </div>
        )}

        <div className="form-group">
          <label>EDUCATION LEVEL</label>
          <select className="pixel-input" value={formData.educationLevel}
            onChange={(e) => setFormData({ ...formData, educationLevel: e.target.value, year: '' })} required>
            <option value="">Select</option>
            {EDUCATION_LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
          </select>
        </div>

        {formData.educationLevel && (
          <div className="form-group">
            <label>YEAR</label>
            <select className="pixel-input" value={formData.year}
              onChange={(e) => setFormData({ ...formData, year: e.target.value })} required>
              <option value="">Select</option>
              {YEAR_OPTIONS[formData.educationLevel]?.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        )}

        <button type="submit" className="pixel-button primary full-width" disabled={!canSubmit}>
          {submitting ? 'CREATING ACCOUNT...' : 'CREATE ACCOUNT'}
        </button>

        <div className="form-footer">
          <span style={{ color: 'var(--text-secondary)' }}>Already have an account?</span>
          <button type="button" className="link-button" onClick={() => onNavigate('login')}>LOGIN</button>
        </div>
      </form>

      {showConfirm && (
        <ConfirmDialog
          message="This account already exists. Would you like to login instead?"
          onConfirm={() => { setShowConfirm(false); onNavigate('login'); }}
          onCancel={() => setShowConfirm(false)} />
      )}
    </div>
  );
}
