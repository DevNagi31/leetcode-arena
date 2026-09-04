import React, { useState } from 'react';
import { Save, X } from 'lucide-react';
import { EDUCATION_LEVELS, YEAR_OPTIONS } from '../utils/constants';
import './ProfileEdit.css';

const ProfileEdit = ({ user, onSave, onCancel, showToast }) => {
  const [formData, setFormData] = useState({
    institutionName: user.institutionName || '',
    educationLevel: user.educationLevel || '',
    year: user.year || ''
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave(formData);
      showToast('Profile updated successfully', 'success');
    } catch (error) {
      showToast('Failed to update profile', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="profile-edit-overlay" onClick={onCancel}>
      <div className="profile-edit-modal" onClick={(e) => e.stopPropagation()}>
        <h2 className="modal-title">EDIT PROFILE</h2>
        <form className="edit-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label>INSTITUTION</label>
            <input
              type="text"
              className="pixel-input"
              value={formData.institutionName}
              onChange={(e) => setFormData({...formData, institutionName: e.target.value})}
              required
            />
          </div>

          <div className="form-group">
            <label>EDUCATION LEVEL</label>
            <select
              className="pixel-input"
              value={formData.educationLevel}
              onChange={(e) => setFormData({...formData, educationLevel: e.target.value, year: ''})}
              required
            >
              {EDUCATION_LEVELS.map(level => (
                <option key={level} value={level}>{level}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>YEAR / LEVEL</label>
            <select
              className="pixel-input"
              value={formData.year}
              onChange={(e) => setFormData({...formData, year: e.target.value})}
              required
            >
              <option value="">Select year/level</option>
              {YEAR_OPTIONS[formData.educationLevel]?.map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>

          <div className="modal-actions">
            <button type="submit" className="pixel-button primary" disabled={saving}>
              <Save size={16} strokeWidth={2} />
              {saving ? 'SAVING...' : 'SAVE'}
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

export default ProfileEdit;
