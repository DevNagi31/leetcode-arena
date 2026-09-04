import '@testing-library/jest-dom';

// jsdom implements neither of these, and the landing page uses both. Without
// the stubs every test that renders <App /> threw before asserting anything.
if (!global.IntersectionObserver) {
  global.IntersectionObserver = class {
    constructor(callback) { this.callback = callback; }
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() { return []; }
  };
}

if (!window.matchMedia) {
  window.matchMedia = (query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  });
}

// jsdom has no layout engine, so <video> playback is unimplemented.
window.HTMLMediaElement.prototype.play = () => Promise.resolve();
window.HTMLMediaElement.prototype.pause = () => {};
