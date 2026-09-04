import React from 'react';
import { AlertTriangle } from 'lucide-react';
import './ProfileEdit.css';

const ConfirmDialog = ({ message, onConfirm, onCancel }) => {
  return (
    <div className="profile-edit-overlay" onClick={onCancel}>
      <div className="profile-edit-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '400px' }}>
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <AlertTriangle size={48} strokeWidth={2} style={{ marginBottom: '16px' }} />
          <h2 className="modal-title" style={{ marginBottom: '16px' }}>CONFIRM</h2>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)', fontWeight: 500, lineHeight: '1.6' }}>
            {message}
          </p>
        </div>
        <div className="modal-actions">
          <button type="button" className="pixel-button primary" onClick={onConfirm}>
            YES
          </button>
          <button type="button" className="pixel-button secondary" onClick={onCancel}>
            NO
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;
