// vitest setup for packages/web/core
// Why matchMedia: jsdom does not implement window.matchMedia.
// @capsuletech/web-style/switcher/theme reads matchMedia at module-load time
// (initialDarkMode detection). After the LCP de-lazy in ui-kit/imports.tsx the
// static web-ui subpath imports (Button, Toggle etc.) transitively pull
// web-style at collect time, so the stub must be in place before any suite runs.
// Identical pattern to packages/web/ui/vitest.setup.ts.
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

// Why ResizeObserver: jsdom does not implement ResizeObserver.
// corvu/resizable (pulled transitively via kobalte) uses it internally.
// Without this stub suites that import web-ui layout primitives throw
// "ReferenceError: ResizeObserver is not defined".
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
