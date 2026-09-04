import React, { useState } from 'react';
import { Lock, X } from 'lucide-react';
import { checkPasswordStrength } from '../utils/constants';
import './ProfileEdit.css';

// Mirrors the backend rule. The strength score is a rough UX signal and does
// not imply the server will accept the password — e.g. "Passwordd" scores 3
// but has no digit, so gating on the score alone produced a server rejection.
const PASSWORD_HINT = 'At least 8 characters, with an uppercase letter, a lowercase letter and a number';
const isStrongPassword = (pw) => /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(pw);

const PasswordChange = ({ onSave, onCancel, showToast }) => {
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [saving, setSaving] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState({ score: 0, message: '', color: 'var(--text-tertiary)' });

  const handlePasswordChange = (e) => {
    const password = e.target.value;
    setFormData({...formData, newPassword: password});
    setPasswordStrength(checkPasswordStrength(password));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (formData.newPassword !== formData.confirmPassword) {
      showToast('Passwords do not match', 'error');
      return;
    }

    if (!isStrongPassword(formData.newPassword)) {
      showToast(PASSWORD_HINT, 'error');
      return;
    }

    if (formData.currentPassword === formData.newPassword) {
      showToast('New password must be different from the current one', 'error');
      return;
    }

    setSaving(true);
    try {
      await onSave({
        currentPassword: formData.currentPassword,
        newPassword: formData.newPassword
      });
      showToast('Password changed successfully', 'success');
      onCancel();
    } catch (error) {
      showToast(error.response?.data?.message || 'Failed to change password', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="profile-edit-overlay" onClick={onCancel}>
      <div className="profile-edit-modal" onClick={(e) => e.stopPropagation()}>
        <h2 className="modal-title">CHANGE PASSWORD</h2>
        <form className="edit-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label>CURRENT PASSWORD</label>
            <input
              type="password"
              className="pixel-input"
              value={formData.currentPassword}
              onChange={(e) => setFormData({...formData, currentPassword: e.target.value})}
              required
            />
          </div>

          <div className="form-group">
            <label>NEW PASSWORD</label>
            <input
              type="password"
              className="pixel-input"
              value={formData.newPassword}
              onChange={handlePasswordChange}
              required
            />
            {formData.newPassword && (
              <div style={{ marginTop: '8px' }}>
                <div style={{ fontSize: '10px', color: passwordStrength.color, marginBottom: '6px', fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase' }}>
                  {passwordStrength.message}
                </div>
                <div style={{ height: '3px', background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
                  <div style={{ height: '100%', width: `${passwordStrength.score * 20}%`, background: 'var(--text-primary)', transition: 'all 0.3s' }}></div>
                </div>
                <p style={{ marginTop: '6px', fontSize: '11px', color: 'var(--text-tertiary)', lineHeight: 1.5 }}>
                  {PASSWORD_HINT}
                </p>
              </div>
            )}
          </div>

          <div className="form-group">
            <label>CONFIRM NEW PASSWORD</label>
            <input
              type="password"
              className="pixel-input"
              value={formData.confirmPassword}
              onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
              required
            />
          </div>

          <div className="modal-actions">
            <button type="submit" className="pixel-button primary" disabled={saving || !isStrongPassword(formData.newPassword)}>
              <Lock size={16} strokeWidth={2} />
              {saving ? 'CHANGING...' : 'CHANGE'}
            </button>
            <button type="button" className="pixel-button secondary" onClick={onCancel}>
              <X size={16} strokeWidth={2} />
              CANCEL
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PasswordChange;
