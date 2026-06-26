import React from 'react';
import { UserPlus, Lock } from 'lucide-react';

export default function AuthChoice({ onNavigate }) {
  return (
    <div className="form-container">
      <button className="back-button" onClick={() => onNavigate('landing')}>← BACK</button>
      <h2 className="form-title">JOIN CODE MANAGER</h2>
      <p style={{ textAlign: 'center', color: 'var(--text-secondary)', marginBottom: '32px', fontSize: '14px', lineHeight: '1.6' }}>
        Track your coding journey and compete with peers
      </p>
      <div className="auth-choice-grid">
        <button className="pixel-button primary full-width" onClick={() => onNavigate('signup')}>
          <UserPlus size={18} strokeWidth={2.5} /> SIGN UP
        </button>
        <button className="pixel-button full-width" onClick={() => onNavigate('login')}>
          <Lock size={18} strokeWidth={2.5} /> LOGIN
        </button>
      </div>
    </div>
  );
}
