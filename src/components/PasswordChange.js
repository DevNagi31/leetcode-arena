import React, { useState } from 'react';
import { Lock, X } from 'lucide-react';
import './ProfileEdit.css';

const PasswordChange = ({ onSave, onCancel, showToast }) => {
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [saving, setSaving] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState({ score: 0, message: '', color: 'var(--text-tertiary)' });

  const checkPasswordStrength = (password) => {
    let score = 0;
    if (password.length === 0) return { score: 0, message: '', color: 'var(--text-tertiary)' };
    if (password.length < 8) return { score: 1, message: 'Too short', color: 'var(--text-primary)' };
    
    score++;
    if (/[a-z]/.test(password)) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/\d/.test(password)) score++;
    if (/[^a-zA-Z\d]/.test(password)) score++;

    const messages = {
      1: { message: 'Weak', color: 'var(--text-primary)' },
      2: { message: 'Fair', color: 'var(--text-primary)' },
      3: { message: 'Moderate', color: 'var(--text-secondary)' },
      4: { message: 'Good', color: 'var(--text-secondary)' },
      5: { message: 'Strong', color: 'var(--text-primary)' }
    };

    return { score, ...messages[score] };
  };

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

    if (passwordStrength.score < 3) {
      showToast('Password is too weak', 'error');
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
            <button type="submit" className="pixel-button primary" disabled={saving || passwordStrength.score < 3}>
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
