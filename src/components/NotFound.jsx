import React from 'react';
import { Home } from 'lucide-react';

export default function NotFound({ onNavigate }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', minHeight: '80vh', padding: '40px',
      textAlign: 'center'
    }}>
      <h1 style={{ fontSize: '72px', fontWeight: 800, marginBottom: '8px', color: 'var(--text-primary)' }}>404</h1>
      <p style={{ color: 'var(--text-secondary)', fontSize: '16px', marginBottom: '32px' }}>
        Page not found. The page you're looking for doesn't exist.
      </p>
      <button className="pixel-button primary" onClick={() => onNavigate('landing')}>
        <Home size={16} /> GO HOME
      </button>
    </div>
  );
}
