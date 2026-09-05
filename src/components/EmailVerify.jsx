import React, { useState } from 'react';
import { authPost } from '../utils/api';

export default function EmailVerify({ onNavigate, currentUser, setCurrentUser, onLogout, showToast }) {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState('');

  const handleVerify = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await authPost('/auth/verify-email', { code });
      setCurrentUser({ ...currentUser, emailVerified: true });
      showToast('Email verified! Welcome aboard.', 'success');
      onNavigate('dashboard');
    } catch (err) {
      const msg = err.response?.data?.message || 'Verification failed';
      setError(msg);
      showToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    setError('');
    try {
      await authPost('/auth/resend-verification');
      showToast('A new code has been sent to your email.', 'success');
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to resend code';
      setError(msg);
      showToast(msg, 'error');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="form-container">
      <h1 className="form-title">VERIFY EMAIL</h1>
      <p style={{ textAlign: 'center', color: 'var(--text-secondary)', marginBottom: '24px', fontSize: '13px', lineHeight: '1.6' }}>
        We sent a 6-digit code to{' '}
        <strong style={{ color: 'var(--text-primary)' }}>{currentUser?.email}</strong>.
        Enter it below to activate your account.
      </p>
      {error && <div className="error-message">{error}</div>}
      <form className="pixel-form" onSubmit={handleVerify}>
        <div className="form-group">
          <label htmlFor="verify-code">VERIFICATION CODE</label>
          <input type="text" id="verify-code" name="code" inputMode="numeric"
            autoComplete="one-time-code"
            className="pixel-input" placeholder="Enter 6-digit code"
            value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} required />
        </div>
        <button type="submit" className="pixel-button primary full-width" disabled={loading || code.length !== 6}>
          {loading ? 'VERIFYING...' : 'VERIFY EMAIL'}
        </button>
      </form>
      <div style={{ textAlign: 'center', marginTop: '16px' }}>
        <button type="button" className="link-button" onClick={handleResend} disabled={resending} style={{ fontSize: '12px' }}>
          {resending ? 'Sending...' : "Didn't get a code? Resend"}
        </button>
      </div>
      <div className="form-footer">
        <span style={{ color: 'var(--text-secondary)' }}>Wrong account?</span>
        <button type="button" className="link-button" onClick={onLogout}>LOG OUT</button>
      </div>
    </div>
  );
}
