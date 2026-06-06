// vitest setup для packages/web/table
// Зеркалит vitest.setup.ts из packages/web/shell (те же jsdom-заглушки).

// ResizeObserver — jsdom не реализует; createInfiniteScroll и virtualizer его используют.
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

// window.matchMedia — jsdom не реализует.
// @capsuletech/web-style/switcher читает matchMedia на уровне модуля (initialDarkMode).
// Без этой заглушки любой тест, импортирующий компонент с web-style, падает с
// "TypeError: window.matchMedia is not a function".
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
