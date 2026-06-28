/* @vitest-environment jsdom */
/**
 * widget-single-render.test.tsx
 *
 * Regression for bug A (ADR 062): the Widget content factory must be
 * instantiated EXACTLY ONCE per mount — never doubled.
 *
 * Root cause that this guards against: WidgetWrapper used to call
 * Component(proxiedUi, store, wrapperProps) at two separate JSX call-sites (the
 * inner-<Show> `fallback` and the settings <div>). Under the nested reactive
 * <Show> the factory ran twice on mount → content mounted ×2 / disposed ×1
 * (churn, net 1). For Widget(Canvas) that meant two <Remote.View> → two
 * RemoteComponent → doubled transport subscriptions → one message delivered
 * twice. The fix shares a single children() memo across both branches.
 *
 * Contracts:
 *  1. Normal path (store, no loader, no settings) — factory called exactly 1×.
 *  2. Outside Controller tree (no store) — factory called exactly 1×.
 *  3. Settings mode ON — factory called exactly 1× (settings-overlay branch).
 *  4. Toggling settings ON→OFF→ON — still 1× total: the instance MOVES between
 *     branches, it is not remounted.
 *  5. Loader path: loading=true → factory NOT called (content not built behind
 *     the loader); loading→false → factory called exactly 1×.
 */

import { createSignal } from 'solid-js';
import { render } from 'solid-js/web';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Context } from '../../engine/ctx';
import { WidgetWrapper } from '../widget';

const [mockSettingsMode, setMockSettingsMode] = createSignal(false);

vi.mock('@capsuletech/web-style', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@capsuletech/web-style')>();
  return {
    ...actual,
    useSettingsMode: () => mockSettingsMode,
  };
});

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

let container: HTMLDivElement;
let cleanup: (() => void) | undefined;

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
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

describe('WidgetWrapper — content instantiated exactly once (bug A regression)', () => {
  it('normal path (store, no loader, no settings) — factory called exactly 1×', () => {
    const store = mkStore(false);
    const factory = vi.fn(() => <div data-testid="content">content</div>);
    const MyWidget = WidgetWrapper(factory);

    cleanup = render(
      withCtx(store, () => <MyWidget>{null}</MyWidget>),
      container,
    );

    expect(factory).toHaveBeenCalledTimes(1);
    expect(container.querySelectorAll('[data-testid="content"]')).toHaveLength(1);
  });

  it('outside Controller tree (no store) — factory called exactly 1×', () => {
    const factory = vi.fn(() => <div data-testid="content">content</div>);
    const MyWidget = WidgetWrapper(factory);

    cleanup = render(() => <MyWidget>{null}</MyWidget>, container);

    expect(factory).toHaveBeenCalledTimes(1);
    expect(container.querySelectorAll('[data-testid="content"]')).toHaveLength(1);
  });

  it('settings mode ON — factory called exactly 1× (settings-overlay branch)', () => {
    const store = mkStore(false, { active: true });
    setMockSettingsMode(true);
    const factory = vi.fn(() => <div data-testid="content">content</div>);
    const MyWidget = WidgetWrapper(factory, {
      settings: [
        { type: 'toggle', label: 'Sync', value: (d) => Boolean(d?.active), tags: ['sync'] },
      ],
    });

    cleanup = render(
      withCtx(store, () => <MyWidget>{null}</MyWidget>),
      container,
    );

    // strip present (settings branch active) AND content rendered exactly once
    expect(container.querySelector('.absolute.inset-x-0.top-0.z-10')).not.toBeNull();
    expect(factory).toHaveBeenCalledTimes(1);
    expect(container.querySelectorAll('[data-testid="content"]')).toHaveLength(1);
  });

  it('toggling settings ON→OFF→ON keeps factory at 1× — instance moves, not remounts', () => {
    const store = mkStore(false, { active: true });
    setMockSettingsMode(false);
    const factory = vi.fn(() => <div data-testid="content">content</div>);
    const MyWidget = WidgetWrapper(factory, {
      settings: [{ type: 'toggle', label: 'Sync', value: () => true, tags: ['sync'] }],
    });

    cleanup = render(
      withCtx(store, () => <MyWidget>{null}</MyWidget>),
      container,
    );

    expect(factory).toHaveBeenCalledTimes(1);

    setMockSettingsMode(true); // → settings-overlay branch
    expect(container.querySelector('.absolute.inset-x-0.top-0.z-10')).not.toBeNull();
    expect(container.querySelectorAll('[data-testid="content"]')).toHaveLength(1);

    setMockSettingsMode(false); // → normal branch
    expect(container.querySelector('.absolute.inset-x-0.top-0.z-10')).toBeNull();
    expect(container.querySelectorAll('[data-testid="content"]')).toHaveLength(1);

    // The single content instance moved between branches — never re-instantiated.
    expect(factory).toHaveBeenCalledTimes(1);
  });

  it('loader path: loading=true → factory NOT called; loading→false → exactly 1×', () => {
    const [loading, setLoading] = createSignal(true);
    const reactiveStore = {
      registerComponent: vi.fn(),
      unregisterComponent: vi.fn(),
      update: vi.fn(),
      updateComponent: vi.fn(),
      ctx: { tag: 'load' },
      styles: {} as Record<string, string>,
      get loading() {
        return loading();
      },
      props: {} as Record<string, any>,
      components: {} as Record<string, any>,
    } as any;
    const ctx = mkCtx(reactiveStore);

    const factory = vi.fn(() => <div data-testid="content">content</div>);
    const MyWidget = WidgetWrapper(factory, {
      loader: () => <div data-testid="loader">loading</div>,
    });

    cleanup = render(
      () => (
        <Context.Provider value={ctx as any}>
          <MyWidget>{null}</MyWidget>
        </Context.Provider>
      ),
      container,
    );

    // Behind the loader, content must not be built at all.
    expect(factory).toHaveBeenCalledTimes(0);
    expect(container.querySelector('[data-testid="loader"]')).not.toBeNull();

    setLoading(false);
    expect(factory).toHaveBeenCalledTimes(1);
    expect(container.querySelectorAll('[data-testid="content"]')).toHaveLength(1);
  });
});
