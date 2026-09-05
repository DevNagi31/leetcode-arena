import React, { useState } from 'react';
import axios from 'axios';
import { API_URL } from '../utils/api';

// Must mirror the backend rule (min 8, one lowercase, one uppercase, one digit)
// — checking only the length here meant a valid-looking password was rejected
// by the server with a confusing error.
const PASSWORD_HINT = 'Password must be at least 8 characters with an uppercase letter, a lowercase letter and a number';
const isStrongPassword = (pw) => /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(pw);

export default function ForgotPassword({ onNavigate, showToast }) {
  const [step, setStep] = useState('email'); // email | code | newPassword
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleRequestCode = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await axios.post(`${API_URL}/auth/forgot-password`, { email });
      showToast(res.data.message || 'Reset code sent!', 'success');
      setStep('code');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send reset code');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await axios.post(`${API_URL}/auth/verify-reset-code`, { email, code });
      setResetToken(res.data.resetToken);
      showToast('Code verified!', 'success');
      setStep('newPassword');
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid or expired code');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (!isStrongPassword(newPassword)) {
      setError(PASSWORD_HINT);
      return;
    }
    setLoading(true);
    setError('');
    try {
      await axios.post(`${API_URL}/auth/reset-password`, { resetToken, newPassword });
      showToast('Password reset successfully!', 'success');
      onNavigate('login');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="form-container">
      <button className="back-button" onClick={() => {
        if (step === 'code') setStep('email');
        else if (step === 'newPassword') setStep('code');
        else onNavigate('login');
      }}>← BACK</button>

      <h1 className="form-title">
        {step === 'email' && 'FORGOT PASSWORD'}
        {step === 'code' && 'ENTER CODE'}
        {step === 'newPassword' && 'NEW PASSWORD'}
      </h1>

      {error && <div className="error-message">{error}</div>}

      {step === 'email' && (
        <form className="pixel-form" onSubmit={handleRequestCode}>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '20px', textAlign: 'center' }}>
            Enter your email and we'll send you a reset code.
          </p>
          <div className="form-group">
            <label htmlFor="fp-email">EMAIL</label>
            <input type="email" id="fp-email" name="email" autoComplete="email"
              className="pixel-input" placeholder="your@email.com"
              value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <button type="submit" className="pixel-button primary full-width" disabled={loading}>
            {loading ? 'SENDING...' : 'SEND RESET CODE'}
          </button>
        </form>
      )}

      {step === 'code' && (
        <form className="pixel-form" onSubmit={handleVerifyCode}>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '20px', textAlign: 'center' }}>
            Enter the 6-digit code sent to {email}
          </p>
          <div className="form-group">
            <label htmlFor="fp-code">RESET CODE</label>
            <input type="text" id="fp-code" name="code" inputMode="numeric"
              autoComplete="one-time-code"
              className="pixel-input" placeholder="Enter 6-digit code"
              value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              maxLength={6} required style={{ textAlign: 'center', letterSpacing: '8px', fontSize: '24px' }} />
          </div>
          <button type="submit" className="pixel-button primary full-width" disabled={loading || code.length !== 6}>
            {loading ? 'VERIFYING...' : 'VERIFY CODE'}
          </button>
        </form>
      )}

      {step === 'newPassword' && (
        <form className="pixel-form" onSubmit={handleResetPassword}>
          <div className="form-group">
            <label htmlFor="fp-new">NEW PASSWORD</label>
            <input type="password" id="fp-new" name="newPassword" autoComplete="new-password"
              className="pixel-input" placeholder="Min 8 chars, upper, lower & number"
              value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required />
            <p style={{ marginTop: '6px', fontSize: '11px', color: 'var(--text-tertiary)', lineHeight: 1.5 }}>
              {PASSWORD_HINT}
            </p>
          </div>
          <div className="form-group">
            <label htmlFor="fp-confirm">CONFIRM PASSWORD</label>
            <input type="password" id="fp-confirm" name="confirmPassword" autoComplete="new-password"
              className="pixel-input" placeholder="Confirm new password"
              value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
          </div>
          <button type="submit" className="pixel-button primary full-width" disabled={loading}>
            {loading ? 'RESETTING...' : 'RESET PASSWORD'}
          </button>
        </form>
      )}
    </div>
  );
}
