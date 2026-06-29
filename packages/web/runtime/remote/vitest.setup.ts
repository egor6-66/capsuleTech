// vitest setup for packages/web/runtime/remote
// Why matchMedia: jsdom does not implement window.matchMedia.
// @capsuletech/web-style/switcher/theme reads matchMedia at module-load time
// (initialDarkMode detection). RemoteComponent pulls web-style transitively
// (host-theme forwarding) AND via @capsuletech/web-core/bootstrap, so the stub
// must be in place before any suite collects. Same pattern as
// packages/web/runtime/core/vitest.setup.ts.
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
