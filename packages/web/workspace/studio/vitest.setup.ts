// vitest setup for @capsuletech/web-studio.
// Why: jsdom does not implement window.matchMedia / ResizeObserver.
// @capsuletech/web-style/switcher reads matchMedia at module-load time
// (initialDarkMode). ComponentsPalette depending on size measurement (corvu/kobalte)
// touch ResizeObserver. Without these stubs any test importing real kit
// components throws at import time.

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}
Object.defineProperty(globalThis, 'ResizeObserver', {
  writable: true,
  configurable: true,
  value: ResizeObserverMock,
});

Object.defineProperty(globalThis, 'matchMedia', {
  writable: true,
  configurable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
});
