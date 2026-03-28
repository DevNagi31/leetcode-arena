import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { EDUCATION_LEVELS, YEAR_OPTIONS, checkPasswordStrength } from '../utils/constants';
import { API_URL } from '../utils/api';

export default function EducationInfo({ onNavigate, setToken, setCurrentUser, setError, error, showToast }) {
  const [formData, setFormData] = useState({ username: '', email: '', password: '', country: '', educationLevel: '', institutionName: '', year: '' });
  const [submitting, setSubmitting] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState({ score: 0, message: '', color: 'var(--text-tertiary)' });
  const [countries, setCountries] = useState([]);
  const [universities, setUniversities] = useState([]);
  const [showCustomInput, setShowCustomInput] = useState(false);

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
      try { const r = await axios.get(`${API_URL}/universities/search`, { params: { name: formData.institutionName, country: formData.country } }); setUniversities(r.data); }
      catch (e) { /* silently fail */ }
    };
    searchUniversities();
  }, [formData.institutionName, formData.country]);

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
      const response = await axios.post(`${API_URL}/auth/register`, { ...formData, leetcodeUsername: leetcodeData.username });
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
      localStorage.removeItem('tempLeetCodeData');
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
            {EDUCATION_LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
          </select>
        </div>
        {formData.educationLevel && (
          <div className="form-group">
            <label>YEAR</label>
            <select className="pixel-input" value={formData.year}
              onChange={(e) => setFormData({...formData, year: e.target.value})} required>
              <option value="">Select</option>
              {YEAR_OPTIONS[formData.educationLevel]?.map(y => <option key={y} value={y}>{y}</option>)}
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
