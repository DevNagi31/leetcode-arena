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

describe('App', () => {
  beforeEach(() => {
    localStorageMock.clear();
  });

  test('renders the landing hero when not logged in', () => {
    render(<App />);
    expect(screen.getByText('LEETCODE')).toBeInTheDocument();
    expect(screen.getByText('ARENA')).toBeInTheDocument();
  });

  test('renders both get-started calls to action', () => {
    render(<App />);
    expect(screen.getByText('GET STARTED')).toBeInTheDocument();
    expect(screen.getByText(/GET STARTED — IT'S FREE/)).toBeInTheDocument();
  });

  test('renders the hero feature highlights', () => {
    render(<App />);
    expect(screen.getByText('Daily streaks')).toBeInTheDocument();
    expect(screen.getByText('Live leaderboard')).toBeInTheDocument();
    expect(screen.getByText('Friend battles')).toBeInTheDocument();
  });

  test('renders the feature section headings', () => {
    render(<App />);
    expect(screen.getByText('Track Progress')).toBeInTheDocument();
    expect(screen.getByText('Build Streaks')).toBeInTheDocument();
    expect(screen.getByText('Compete Globally')).toBeInTheDocument();
  });
});
