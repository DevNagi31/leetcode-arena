import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// Where the Express API is listening during development. Override when the
// server runs on a non-default port: VITE_PROXY_TARGET=http://localhost:5055 npm start
const API_TARGET = process.env.VITE_PROXY_TARGET || 'http://localhost:5001';

export default defineConfig({
  plugins: [react()],

  server: {
    port: 3000,
    // Replaces CRA's "proxy" field. The websocket entry is the part CRA never
    // handled: Socket.io needs the upgrade forwarded, not just the HTTP poll.
    proxy: {
      '/api': {
        target: API_TARGET,
        changeOrigin: true,
      },
      '/socket.io': {
        target: API_TARGET,
        changeOrigin: true,
        ws: true,
      },
    },
  },

  build: {
    // The Express server serves ../build in production, and render.yaml and
    // .gitignore both reference it — so keep CRA's output directory rather
    // than Vite's default "dist".
    outDir: 'build',
    sourcemap: false,
  },

  test: {
    // Frontend only. The backend has its own Jest suite (cd server && npm test);
    // running those files under two different runners invites the two to drift.
    include: ['src/**/*.{test,spec}.{js,jsx}'],
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/setupTests.js',
    // The suite asserts on behaviour, not styling; skipping CSS keeps it fast.
    css: false,
  },
});
