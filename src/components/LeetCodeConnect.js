import React, { useState } from 'react';
import axios from 'axios';
import ConfirmDialog from './ConfirmDialog';
import { API_URL } from '../utils/api';

export default function LeetCodeConnect({ onNavigate, setError, error, showToast }) {
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
