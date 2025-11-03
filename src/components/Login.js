import React, { useState } from 'react';
import axios from 'axios';

const API_URL = 'https://leetcode-arena-production.up.railway.app';

const Login = ({ onNavigate, setToken, setCurrentUser, showToast }) => {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await axios.post(`${API_URL}/api/auth/login`, formData);
      
      localStorage.setItem('token', response.data.token);
      setToken(response.data.token);
      setCurrentUser(response.data.user);
      showToast('Welcome back! 🎮', 'success');
      onNavigate('dashboard');
    } catch (error) {
      const errorMsg = error.response?.data?.message || 'Login failed';
      showToast(errorMsg, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="form-container">
      <button className="back-button" onClick={() => onNavigate('landing')}>← BACK</button>
      <h2 className="form-title">PLAYER LOGIN</h2>
      
      <form className="pixel-form" onSubmit={handleSubmit}>
        <div className="form-group">
          <label>EMAIL</label>
          <input
            type="email"
            className="pixel-input"
            placeholder="your@email.com"
            value={formData.email}
            onChange={(e) => setFormData({...formData, email: e.target.value})}
            required
          />
        </div>

        <div className="form-group">
          <label>PASSWORD</label>
          <input
            type="password"
            className="pixel-input"
            placeholder="Enter your password"
            value={formData.password}
            onChange={(e) => setFormData({...formData, password: e.target.value})}
            required
          />
        </div>

        <button type="submit" className="pixel-button primary full-width" disabled={loading}>
          {loading ? 'LOGGING IN...' : 'LOGIN'}
        </button>

        <div className="form-footer">
          <span style={{ color: 'var(--text-secondary)' }}>Don't have an account?</span>
          <button 
            type="button"
            className="link-button" 
            onClick={() => onNavigate('leetcode-connect')}
          >
            REGISTER
          </button>
        </div>
      </form>
    </div>
  );
};

export default Login;
