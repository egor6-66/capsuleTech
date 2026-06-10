// vitest setup for packages/web/menu — mirrors web-shell/web-table jsdom stubs.

// ResizeObserver — jsdom doesn't implement it; Kobalte popper/positioner use it.
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

// window.matchMedia — jsdom doesn't implement it; @capsuletech/web-style reads it
// at module level (initialDarkMode). Without this stub any test importing a
// component that pulls web-style fails with "matchMedia is not a function".
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
