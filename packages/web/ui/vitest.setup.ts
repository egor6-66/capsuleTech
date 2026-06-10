// vitest setup for packages/web/ui
// Why: jsdom does not implement ResizeObserver, which corvu/resizable uses
// internally. Without this mock the matrix-resize render tests throw
// "ReferenceError: ResizeObserver is not defined".
// The mock records calls but does not actually measure — that is intentional:
// visual sizing is non-deterministic in jsdom and is not what the tests assert.

// Why: jsdom's CSS parser (css-tree) throws SyntaxError on `calc(NaN%)`.
// Kobalte Slider computes thumb position as `calc(${percent * 100}%)`. On the
// very first render the thumb has not been registered in the DomCollection yet
// (ref callback fires asynchronously in jsdom), so `index()` returns -1 and
// `getThumbPercent(-1)` returns NaN.  The resulting `calc(NaN%)` is valid from
// a CSS-runtime perspective (browsers treat it as 0) but css-tree rejects it.
//
// Fix: wrap `CSSStyleDeclaration.setProperty` to silently discard values that
// contain `NaN`.  This only affects jsdom in tests — real browsers never see
// it because the ref callback fires synchronously before paint.
const _nativeSetProperty = CSSStyleDeclaration.prototype.setProperty;
CSSStyleDeclaration.prototype.setProperty = function patchedSetProperty(
  property: string,
  value: string | null,
  priority?: string,
) {
  if (value != null && String(value).includes('NaN')) return;
  // biome-ignore lint/style/noArguments: intentional passthrough
  return _nativeSetProperty.apply(this, arguments as unknown as Parameters<typeof _nativeSetProperty>);
};
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

// Why: jsdom does not implement window.matchMedia.
// @capsuletech/web-style/switcher/theme reads matchMedia at module-load time
// (initialDarkMode). Without this stub any test that imports a component
// which transitively imports web-style throws
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
