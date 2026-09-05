import React, { useState, useEffect, useRef } from 'react';
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
  const helpRef = useRef(null);

  useEffect(() => {
    if (!showHelp) return;
    const onDown = (e) => {
      if (helpRef.current && !helpRef.current.contains(e.target)) setShowHelp(false);
    };
    const onKey = (e) => { if (e.key === 'Escape') setShowHelp(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [showHelp]);

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
      <h1 className="form-title">CREATE ACCOUNT</h1>
      {error && <div className="error-message">{error}</div>}
      <form className="pixel-form" onSubmit={handleSubmit}>

        <div className="form-group">
          <label htmlFor="signup-leetcode" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            LEETCODE USERNAME
            <span className="field-help" ref={helpRef}>
              <button
                type="button"
                aria-label="Where do I find my LeetCode username?"
                aria-expanded={showHelp}
                onClick={() => setShowHelp((v) => !v)}
                className="field-help-btn"
              >
                <HelpCircle size={14} strokeWidth={2.5} />
              </button>
              {showHelp && (
                <span className="field-help-popover" role="tooltip">
                  <img
                    src="/leetcode-username-help.jpg"
                    alt="A LeetCode profile header. The username sits directly beneath the display name and is highlighted."
                    className="field-help-img"
                    width={660}
                    height={230}
                  />
                  <span className="field-help-text">
                    Open your LeetCode profile. Your username is the smaller grey text
                    directly under your display name — it's also the last part of your
                    profile URL (<code>leetcode.com/u/<b>your-username</b></code>).
                    Enter it exactly.
                  </span>
                </span>
              )}
            </span>
          </label>
          <input type="text" id="signup-leetcode" name="leetcodeUsername" autoComplete="off"
            className="pixel-input" placeholder="Your LeetCode username"
            value={formData.leetcodeUsername}
            onChange={(e) => setFormData({ ...formData, leetcodeUsername: e.target.value })} required />
        </div>

        <div className="form-group">
          <label htmlFor="signup-username">USERNAME</label>
          <input type="text" id="signup-username" name="username" autoComplete="username"
            className="pixel-input" placeholder="3-20 characters"
            value={formData.username} onChange={(e) => setFormData({ ...formData, username: e.target.value })} required />
        </div>

        <div className="form-group">
          <label htmlFor="signup-email">EMAIL</label>
          <input type="email" id="signup-email" name="email" autoComplete="email"
            className="pixel-input" placeholder="your@email.com"
            value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} required />
        </div>

        <div className="form-group">
          <label htmlFor="signup-password">PASSWORD</label>
          <input type="password" id="signup-password" name="password" autoComplete="new-password"
            className="pixel-input" placeholder="Min 8 chars, upper, lower & number"
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
          <label htmlFor="signup-country">COUNTRY</label>
          <select id="signup-country" name="country" autoComplete="country-name"
            className="pixel-input" value={formData.country}
            onChange={(e) => setFormData({ ...formData, country: e.target.value, institutionName: '' })} required>
            <option value="">Select Country</option>
            {countries.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        {formData.country && (
          <div className="form-group">
            <label htmlFor="signup-institution">INSTITUTION</label>
            {!showCustomInput ? (
              <>
                <input type="text" className="pixel-input" placeholder="Start typing to search..."
                  value={formData.institutionName} onChange={(e) => setFormData({ ...formData, institutionName: e.target.value })}
                  id="signup-institution" name="institutionName" autoComplete="organization"
                  list="universities" required />
                <datalist id="universities">
                  {universities.map((uni, idx) => <option key={idx} value={uni.name}>{uni.name}</option>)}
                </datalist>
                <button type="button" className="link-button" onClick={() => setShowCustomInput(true)} style={{ marginTop: '8px', fontSize: '12px' }}>
                  Can't find your school? Add manually
                </button>
              </>
            ) : (
              <>
                <input type="text" id="signup-institution" name="institutionName" autoComplete="organization"
                  className="pixel-input" placeholder="Enter institution name"
                  value={formData.institutionName} onChange={(e) => setFormData({ ...formData, institutionName: e.target.value })} required />
                <button type="button" className="link-button" onClick={() => setShowCustomInput(false)} style={{ marginTop: '8px', fontSize: '12px' }}>← Back to search</button>
              </>
            )}
          </div>
        )}

        <div className="form-group">
          <label htmlFor="signup-education">EDUCATION LEVEL</label>
          <select id="signup-education" name="educationLevel"
            className="pixel-input" value={formData.educationLevel}
            onChange={(e) => setFormData({ ...formData, educationLevel: e.target.value, year: '' })} required>
            <option value="">Select</option>
            {EDUCATION_LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
          </select>
        </div>

        {formData.educationLevel && (
          <div className="form-group">
            <label htmlFor="signup-year">YEAR</label>
            <select id="signup-year" name="year"
              className="pixel-input" value={formData.year}
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
