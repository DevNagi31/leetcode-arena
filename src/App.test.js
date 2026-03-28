import React from 'react';
import { render, screen } from '@testing-library/react';
import App from './App';

// Mock localStorage
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: (key) => store[key] || null,
    setItem: (key, value) => { store[key] = value.toString(); },
    removeItem: (key) => { delete store[key]; },
    clear: () => { store = {}; },
  };
})();
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Mock matchMedia
window.matchMedia = window.matchMedia || function() {
  return { matches: false, addListener: () => {}, removeListener: () => {} };
};

describe('App', () => {
  beforeEach(() => {
    localStorageMock.clear();
  });

  test('renders landing page when not logged in', () => {
    render(<App />);
    expect(screen.getByText('CODE')).toBeInTheDocument();
    expect(screen.getByText('MANAGER')).toBeInTheDocument();
    expect(screen.getByText('GET STARTED')).toBeInTheDocument();
    expect(screen.getByText('LEADERBOARD')).toBeInTheDocument();
  });

  test('renders theme toggle button', () => {
    render(<App />);
    const themeToggle = document.querySelector('.theme-toggle');
    expect(themeToggle).toBeInTheDocument();
  });

  test('renders landing page features', () => {
    render(<App />);
    expect(screen.getByText('Track your coding activity')).toBeInTheDocument();
    expect(screen.getByText('Identify weak areas & improve')).toBeInTheDocument();
    expect(screen.getByText('Compete with your university')).toBeInTheDocument();
    expect(screen.getByText('Connect with fellow coders')).toBeInTheDocument();
  });
});
