// vitest setup for packages/web/auth
// Зеркалит web-shell/vitest.setup.ts — те же браузерные API,
// которых нет в jsdom, но которые нужны транзитивным зависимостям.

// jsdom не реализует ResizeObserver.
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

// jsdom не реализует window.matchMedia.
// @capsuletech/web-style/switcher читает matchMedia при загрузке модуля.
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
