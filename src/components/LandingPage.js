import React from 'react';
import { Trophy, Zap } from 'lucide-react';

export default function LandingPage({ onNavigate }) {
  return (
    <div className="landing-page">
      <div className="game-title">
        <span className="title-line">CODE</span>
        <span className="title-line">MANAGER</span>
      </div>
      <div className="game-subtitle">DEVELOPER GROWTH PLATFORM</div>
      <div className="game-tagline">Track progress, compete with friends, get better at coding.</div>
      <div className="menu-options">
        <button className="pixel-button primary" onClick={() => onNavigate('auth-choice')}>
          <Zap size={16} /> GET STARTED
        </button>
        <button className="pixel-button secondary" onClick={() => onNavigate('leaderboard')}>
          <Trophy size={16} /> LEADERBOARD
        </button>
      </div>
    </div>
  );
}
