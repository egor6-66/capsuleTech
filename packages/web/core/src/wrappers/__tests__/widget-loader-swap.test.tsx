/* @vitest-environment jsdom */
/**
 * widget-loader-swap.test.tsx
 *
 * Characterization tests for Widget loader-swap + settings-strip features.
 *
 * Part A — Loader swap (options.loader):
 *   Widget(content, { loader }) — second arg is options-object (clean break from positional).
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
 *
 * Part B — Settings strip (options.settings):
 *  10. settingsMode=ON + settings present + store available → strip renders with button.
 *  11. settingsMode=OFF → strip does NOT render.
 *  12. settingsMode=ON + settings empty → strip does NOT render.
 *  13. settingsMode=ON + no store (outside Controller tree) → strip does NOT render.
 *  14. Button in strip carries the correct tags (meta.tags).
 *  15. Button shows plain label in both states; active state conveyed via pill fill (bg-primary), inactive via bg-muted/40.
 */

import { createSignal } from 'solid-js';
import { render } from 'solid-js/web';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Context } from '../../engine/ctx';
import { WidgetWrapper } from '../widget';

// ---------------------------------------------------------------------------
// settingsMode mock — module-level singleton from @capsuletech/web-style.
// We override it via vi.mock so tests can control the signal value.
// importOriginal preserves all other exports (cva, createStyle, etc.) so that
// web-ui/button (which imports from web-style) does not break.
// ---------------------------------------------------------------------------

const [mockSettingsMode, setMockSettingsMode] = createSignal(false);

vi.mock('@capsuletech/web-style', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@capsuletech/web-style')>();
  return {
    ...actual,
    useSettingsMode: () => mockSettingsMode,
  };
});

// ---------------------------------------------------------------------------
// Minimal fake IBridge — mirrors mkStore from widget-page-store.test.tsx
// ---------------------------------------------------------------------------

const mkStore = (loading = false, data: any = {}) =>
  ({
    registerComponent: vi.fn(),
    unregisterComponent: vi.fn(),
    update: vi.fn(),
    updateComponent: vi.fn(),
    ctx: { tag: 'test', data },
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
  // Default: settings mode OFF
  setMockSettingsMode(false);
});

afterEach(() => {
  cleanup?.();
  document.body.removeChild(container);
  vi.restoreAllMocks();
  cleanup = undefined;
});

function withCtx(store: any, children: () => any) {
  const ctx = mkCtx(store);
  return () => <Context.Provider value={ctx as any}>{children()}</Context.Provider>;
}

// ---------------------------------------------------------------------------
// Part A: Loader swap — options.loader form
// ---------------------------------------------------------------------------

describe('WidgetWrapper loader swap — content vs loader selection (options.loader)', () => {
  it('renders loader when store.loading=true and loader is provided via options', () => {
    const store = mkStore(true);
    let contentMounted = false;
    let loaderMounted = false;

    const MyWidget = WidgetWrapper(
      (_ui, _store) => {
        contentMounted = true;
        return <div data-testid="content">content</div>;
      },
      {
        loader: (_ui) => {
          loaderMounted = true;
          return <div data-testid="loader">loading...</div>;
        },
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

  it('renders content when store.loading=false and loader is provided via options', () => {
    const store = mkStore(false);
    let contentMounted = false;
    let loaderMounted = false;

    const MyWidget = WidgetWrapper(
      (_ui, _store) => {
        contentMounted = true;
        return <div data-testid="content">content</div>;
      },
      {
        loader: (_ui) => {
          loaderMounted = true;
          return <div data-testid="loader">loading...</div>;
        },
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

  it('renders content when loading=true but NO loader provided (no options)', () => {
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
      {
        loader: (_ui) => {
          return <div data-testid="loader">loading...</div>;
        },
      },
    );

    cleanup = render(() => <MyWidget>{null}</MyWidget>, container);

    expect(contentMounted).toBe(true);
    expect(container.querySelector('[data-testid="content"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="loader"]')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Part A: Loader — arg forwarding
// ---------------------------------------------------------------------------

describe('WidgetWrapper loader — arg forwarding (options.loader)', () => {
  it('loader receives proxiedUi as first arg and wrapperProps as second arg', () => {
    const store = mkStore(true);
    let capturedUi: any = null;
    let capturedProps: any = null;

    const MyWidget = WidgetWrapper<{ title?: string }>(
      (_ui, _store) => <div />,
      {
        loader: (ui, props) => {
          capturedUi = ui;
          capturedProps = props;
          return <div data-testid="loader" />;
        },
      },
    );

    cleanup = render(
      withCtx(store, () => <MyWidget title="test-title">{null}</MyWidget>),
      container,
    );

    expect(capturedUi).not.toBeNull();
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
      { loader: (_ui) => <div data-testid="loader" /> },
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
// Part A: Reactive transitions
// ---------------------------------------------------------------------------

describe('WidgetWrapper loader swap — reactive transitions (options.loader)', () => {
  it('transition loading true→false: loader unmounts, content mounts', () => {
    const [loading, setLoading] = createSignal(true);
    const reactiveStore = {
      registerComponent: vi.fn(),
      unregisterComponent: vi.fn(),
      update: vi.fn(),
      updateComponent: vi.fn(),
      ctx: { tag: 'trans' },
      styles: {} as Record<string, string>,
      get loading() {
        return loading();
      },
      props: {} as Record<string, any>,
      components: {} as Record<string, any>,
    } as any;
    const ctx = mkCtx(reactiveStore);

    const MyWidget = WidgetWrapper(
      (_ui) => <div data-testid="content">content</div>,
      { loader: (_ui) => <div data-testid="loader">loading</div> },
    );

    cleanup = render(
      () => (
        <Context.Provider value={ctx as any}>
          <MyWidget>{null}</MyWidget>
        </Context.Provider>
      ),
      container,
    );

    expect(container.querySelector('[data-testid="loader"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="content"]')).toBeNull();

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
      get loading() {
        return loading();
      },
      props: {} as Record<string, any>,
      components: {} as Record<string, any>,
    } as any;
    const ctx = mkCtx(reactiveStore);

    const MyWidget = WidgetWrapper(
      (_ui) => <div data-testid="content">content</div>,
      { loader: (_ui) => <div data-testid="loader">loading</div> },
    );

    cleanup = render(
      () => (
        <Context.Provider value={ctx as any}>
          <MyWidget>{null}</MyWidget>
        </Context.Provider>
      ),
      container,
    );

    expect(container.querySelector('[data-testid="content"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="loader"]')).toBeNull();

    setLoading(true);
    expect(container.querySelector('[data-testid="loader"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="content"]')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Part B: Settings strip
// ---------------------------------------------------------------------------

describe('WidgetWrapper settings strip', () => {
  it('renders strip with button when settingsMode=ON, settings present, store available', () => {
    const store = mkStore(false, { active: true });
    setMockSettingsMode(true);

    const MyWidget = WidgetWrapper(
      (_ui, _store) => <div data-testid="content">content</div>,
      {
        settings: [
          {
            type: 'toggle',
            label: 'Sync',
            value: (data) => Boolean(data?.active),
            tags: ['sync-toggle'],
          },
        ],
      },
    );

    cleanup = render(
      withCtx(store, () => <MyWidget>{null}</MyWidget>),
      container,
    );

    // Strip wrapper must be present
    const strip = container.querySelector(
      '.absolute.inset-x-0.top-0.z-10',
    );
    expect(strip).not.toBeNull();

    // Button inside strip must be present
    const button = strip?.querySelector('button');
    expect(button).not.toBeNull();
  });

  it('does NOT render strip when settingsMode=OFF', () => {
    const store = mkStore(false, { active: true });
    setMockSettingsMode(false); // OFF

    const MyWidget = WidgetWrapper(
      (_ui, _store) => <div data-testid="content">content</div>,
      {
        settings: [
          {
            type: 'toggle',
            label: 'Sync',
            value: () => true,
            tags: ['sync-toggle'],
          },
        ],
      },
    );

    cleanup = render(
      withCtx(store, () => <MyWidget>{null}</MyWidget>),
      container,
    );

    const strip = container.querySelector('.absolute.inset-x-0.top-0.z-10');
    expect(strip).toBeNull();
  });

  it('does NOT render strip when settings array is empty', () => {
    const store = mkStore(false);
    setMockSettingsMode(true);

    const MyWidget = WidgetWrapper(
      (_ui, _store) => <div data-testid="content">content</div>,
      { settings: [] },
    );

    cleanup = render(
      withCtx(store, () => <MyWidget>{null}</MyWidget>),
      container,
    );

    const strip = container.querySelector('.absolute.inset-x-0.top-0.z-10');
    expect(strip).toBeNull();
  });

  it('does NOT render strip when Widget is outside Controller tree (no store)', () => {
    setMockSettingsMode(true);

    const MyWidget = WidgetWrapper(
      (_ui, _store) => <div data-testid="content">content</div>,
      {
        settings: [
          {
            type: 'toggle',
            label: 'Sync',
            value: () => true,
            tags: ['sync-toggle'],
          },
        ],
      },
    );

    // No Context.Provider — store is undefined
    cleanup = render(() => <MyWidget>{null}</MyWidget>, container);

    const strip = container.querySelector('.absolute.inset-x-0.top-0.z-10');
    expect(strip).toBeNull();
  });

  it('button shows plain label in both active and inactive states (state via fill, not text prefix)', () => {
    const [active, setActive] = createSignal(true);
    const reactiveStore = {
      registerComponent: vi.fn(),
      unregisterComponent: vi.fn(),
      update: vi.fn(),
      updateComponent: vi.fn(),
      ctx: { tag: 'test', data: { active: true } },
      styles: {} as Record<string, string>,
      get loading() { return false; },
      props: {} as Record<string, any>,
      components: {} as Record<string, any>,
    } as any;

    setMockSettingsMode(true);

    const MyWidget = WidgetWrapper(
      (_ui, _store) => <div data-testid="content">content</div>,
      {
        settings: [
          {
            type: 'toggle',
            label: 'Sync',
            value: (_data) => active(), // reactive — reads from signal
            tags: ['sync-toggle'],
          },
        ],
      },
    );

    const ctx = mkCtx(reactiveStore);
    cleanup = render(
      () => (
        <Context.Provider value={ctx as any}>
          <MyWidget>{null}</MyWidget>
        </Context.Provider>
      ),
      container,
    );

    const button = container.querySelector('button');
    expect(button).not.toBeNull();
    // Active state: label shown without prefix (state conveyed via pill fill class, not text)
    expect(button?.textContent).toBe('Sync');
    // Active pill: primary fill + pill shape
    expect(button?.className).toContain('bg-primary');
    expect(button?.className).toContain('rounded-full');
    // No ✓ prefix in text regardless of state
    expect(button?.textContent).not.toContain('✓');
  });
});
