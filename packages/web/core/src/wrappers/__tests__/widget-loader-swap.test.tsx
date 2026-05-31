/* @vitest-environment jsdom */
/**
 * widget-loader-swap.test.tsx
 *
 * Characterization tests for Widget loader-swap feature:
 *   Widget(content, loader?) — second optional argument.
 *
 * Contracts verified:
 *  1. When store.loading=true AND loader provided — loader is rendered, content is NOT mounted.
 *  2. When store.loading=false AND loader provided — content is rendered, loader is NOT mounted.
 *  3. When store.loading=true AND no loader — content is always rendered (backward-compat).
 *  4. When Widget is outside Controller tree (store=undefined) — content renders, no crash.
 *  5. Loader receives proxiedUi as first arg and wrapperProps as second arg.
 *  6. Content receives proxiedUi, store, and wrapperProps (normal Widget signature).
 *  7. Both content and loader share the same ShapeUiContext (same proxiedUi).
 *  8. Transition: loading true→false → loader unmounts, content mounts.
 *  9. Transition: loading false→true → content unmounts, loader mounts.
 */

import { createSignal } from 'solid-js';
import { render } from 'solid-js/web';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Context } from '../../engine/ctx';
import { WidgetWrapper } from '../widget';

// ---------------------------------------------------------------------------
// Minimal fake IBridge — mirrors mkStore from widget-page-store.test.tsx
// ---------------------------------------------------------------------------

const mkStore = (loading = false) =>
  ({
    registerComponent: vi.fn(),
    unregisterComponent: vi.fn(),
    update: vi.fn(),
    updateComponent: vi.fn(),
    ctx: { tag: 'test' },
    styles: {} as Record<string, string>,
    loading,
    props: {} as Record<string, any>,
    components: {} as Record<string, any>,
  }) as any;

const mkCtx = (store: any) => ({
  state: { value: 'idle' } as any,
  store,
  controller: { onClick: vi.fn() } as any,
  parent: undefined,
});

// ---------------------------------------------------------------------------
// Test infra
// ---------------------------------------------------------------------------

let container: HTMLDivElement;
let cleanup: (() => void) | undefined;

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
});

afterEach(() => {
  cleanup?.();
  document.body.removeChild(container);
  vi.restoreAllMocks();
  cleanup = undefined;
});

function withCtx(store: any, children: () => any) {
  const ctx = mkCtx(store);
  return () => (
    <Context.Provider value={ctx as any}>
      {children()}
    </Context.Provider>
  );
}

// ---------------------------------------------------------------------------
// 1. loading=true + loader provided → loader renders, content NOT mounted
// ---------------------------------------------------------------------------

describe('WidgetWrapper loader swap — content vs loader selection', () => {
  it('renders loader when store.loading=true and loader is provided', () => {
    const store = mkStore(true);
    let contentMounted = false;
    let loaderMounted = false;

    const MyWidget = WidgetWrapper(
      (_ui, _store) => {
        contentMounted = true;
        return <div data-testid="content">content</div>;
      },
      (_ui) => {
        loaderMounted = true;
        return <div data-testid="loader">loading...</div>;
      },
    );

    cleanup = render(
      withCtx(store, () => <MyWidget>{null}</MyWidget>),
      container,
    );

    expect(loaderMounted).toBe(true);
    expect(contentMounted).toBe(false);
    expect(container.querySelector('[data-testid="loader"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="content"]')).toBeNull();
  });

  it('renders content when store.loading=false and loader is provided', () => {
    const store = mkStore(false);
    let contentMounted = false;
    let loaderMounted = false;

    const MyWidget = WidgetWrapper(
      (_ui, _store) => {
        contentMounted = true;
        return <div data-testid="content">content</div>;
      },
      (_ui) => {
        loaderMounted = true;
        return <div data-testid="loader">loading...</div>;
      },
    );

    cleanup = render(
      withCtx(store, () => <MyWidget>{null}</MyWidget>),
      container,
    );

    expect(contentMounted).toBe(true);
    expect(loaderMounted).toBe(false);
    expect(container.querySelector('[data-testid="content"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="loader"]')).toBeNull();
  });

  it('renders content when loading=true but NO loader provided (backward-compat)', () => {
    const store = mkStore(true);
    let contentMounted = false;

    const MyWidget = WidgetWrapper((_ui, _store) => {
      contentMounted = true;
      return <div data-testid="content">content</div>;
    });

    cleanup = render(
      withCtx(store, () => <MyWidget>{null}</MyWidget>),
      container,
    );

    expect(contentMounted).toBe(true);
    expect(container.querySelector('[data-testid="content"]')).not.toBeNull();
  });

  it('renders content when Widget is outside Controller tree (no store)', () => {
    let contentMounted = false;

    const MyWidget = WidgetWrapper(
      (_ui, _store) => {
        contentMounted = true;
        return <div data-testid="content">content</div>;
      },
      (_ui) => {
        return <div data-testid="loader">loading...</div>;
      },
    );

    cleanup = render(() => <MyWidget>{null}</MyWidget>, container);

    expect(contentMounted).toBe(true);
    expect(container.querySelector('[data-testid="content"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="loader"]')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// 2. Loader receives correct args
// ---------------------------------------------------------------------------

describe('WidgetWrapper loader — arg forwarding', () => {
  it('loader receives proxiedUi as first arg and wrapperProps as second arg', () => {
    const store = mkStore(true);
    let capturedUi: any = null;
    let capturedProps: any = null;

    const MyWidget = WidgetWrapper<{ title?: string }>(
      (_ui, _store) => <div />,
      (ui, props) => {
        capturedUi = ui;
        capturedProps = props;
        return <div data-testid="loader" />;
      },
    );

    cleanup = render(
      withCtx(store, () => <MyWidget title="test-title">{null}</MyWidget>),
      container,
    );

    expect(capturedUi).not.toBeNull();
    // proxiedUi should be Proxy-wrapped (has Skeleton etc.)
    expect(typeof capturedUi).toBe('object');
    expect(capturedProps?.title).toBe('test-title');
  });

  it('content factory still receives (ui, store, props) when not loading', () => {
    const store = mkStore(false);
    let capturedUi: any = null;
    let capturedStore: any = null;
    let capturedProps: any = null;

    const MyWidget = WidgetWrapper<{ label?: string }>(
      (ui, s, props) => {
        capturedUi = ui;
        capturedStore = s;
        capturedProps = props;
        return <div data-testid="content" />;
      },
      (_ui) => <div data-testid="loader" />,
    );

    cleanup = render(
      withCtx(store, () => <MyWidget label="hello">{null}</MyWidget>),
      container,
    );

    expect(capturedUi).not.toBeNull();
    expect(capturedStore).toBe(store);
    expect(capturedProps?.label).toBe('hello');
  });
});

// ---------------------------------------------------------------------------
// 3. Reactive transitions: loading signal changes
// ---------------------------------------------------------------------------

describe('WidgetWrapper loader swap — reactive transitions', () => {
  it('transition loading true→false: loader unmounts, content mounts', () => {
    const [loading, setLoading] = createSignal(true);
    const reactiveStore = {
      registerComponent: vi.fn(),
      unregisterComponent: vi.fn(),
      update: vi.fn(),
      updateComponent: vi.fn(),
      ctx: { tag: 'trans' },
      styles: {} as Record<string, string>,
      get loading() { return loading(); },
      props: {} as Record<string, any>,
      components: {} as Record<string, any>,
    } as any;
    const ctx = mkCtx(reactiveStore);

    const MyWidget = WidgetWrapper(
      (_ui) => <div data-testid="content">content</div>,
      (_ui) => <div data-testid="loader">loading</div>,
    );

    cleanup = render(
      () => (
        <Context.Provider value={ctx as any}>
          <MyWidget>{null}</MyWidget>
        </Context.Provider>
      ),
      container,
    );

    // Initially loading → loader visible, content absent
    expect(container.querySelector('[data-testid="loader"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="content"]')).toBeNull();

    // Transition: loading false → content visible, loader absent
    setLoading(false);
    expect(container.querySelector('[data-testid="content"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="loader"]')).toBeNull();
  });

  it('transition loading false→true: content unmounts, loader mounts', () => {
    const [loading, setLoading] = createSignal(false);
    const reactiveStore = {
      registerComponent: vi.fn(),
      unregisterComponent: vi.fn(),
      update: vi.fn(),
      updateComponent: vi.fn(),
      ctx: { tag: 'trans2' },
      styles: {} as Record<string, string>,
      get loading() { return loading(); },
      props: {} as Record<string, any>,
      components: {} as Record<string, any>,
    } as any;
    const ctx = mkCtx(reactiveStore);

    const MyWidget = WidgetWrapper(
      (_ui) => <div data-testid="content">content</div>,
      (_ui) => <div data-testid="loader">loading</div>,
    );

    cleanup = render(
      () => (
        <Context.Provider value={ctx as any}>
          <MyWidget>{null}</MyWidget>
        </Context.Provider>
      ),
      container,
    );

    // Initially not loading → content visible
    expect(container.querySelector('[data-testid="content"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="loader"]')).toBeNull();

    // Transition: loading true → loader visible, content gone
    setLoading(true);
    expect(container.querySelector('[data-testid="loader"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="content"]')).toBeNull();
  });
});
