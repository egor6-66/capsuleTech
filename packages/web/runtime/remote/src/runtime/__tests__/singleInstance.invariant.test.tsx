/**
 * Single-instance + disposal invariant for the web-remote render chain (bug A,
 * brief-remote-double-instance-fix).
 *
 * The browser trace showed `remote.component:mount` ×2 (both instanceId 'main') for a
 * single in-app <Remote.View> — a leaked ghost owner. The brief hypothesised the double
 * was born INSIDE web-remote (RemoteView → ctx.Remote → RemoteComponent).
 *
 * These tests FALSIFY that hypothesis and lock the invariant: the isolated web-remote
 * chain mounts exactly ONE RemoteComponent per <Remote.View>, even under <Suspense> and
 * lazy()+<Suspense> (the wrappers/registry mounting model), and every mount is balanced
 * by a dispose when the parent scope swaps it out. Since jsdom does NOT reproduce the
 * double here, the in-app ghost originates ABOVE this package, in the consumer
 * composition (router Outlet / Matrix-in-layout) — see the brief escalation.
 */

import { createSignal, lazy, Show, Suspense } from 'solid-js';
import { render } from 'solid-js/web';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Capture every trace() call so we can count component-lifecycle phases.
const { traceSpy } = vi.hoisted(() => ({ traceSpy: vi.fn() }));
vi.mock('@capsuletech/web-profiler/trace', () => ({
  trace: (node: string, phase: string, data?: unknown) => traceSpy(node, phase, data),
}));
// No enclosing host logic-wrapper in this bare render — emit is a no-op.
vi.mock('@capsuletech/web-core/events', () => ({ useEmitOptional: () => () => {} }));

import { RemoteProvider } from '../RemoteProvider';
import { RemoteView } from '../RemoteView';

const countPhase = (phase: string): number =>
  traceSpy.mock.calls.filter((c) => c[0] === 'remote.component' && c[1] === phase).length;

describe('bug A — one <Remote.View> mounts exactly one RemoteComponent', () => {
  let container: HTMLDivElement;
  let disposeRoot: (() => void) | undefined;

  beforeEach(() => {
    traceSpy.mockReset();
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    disposeRoot?.();
    disposeRoot = undefined;
    document.body.removeChild(container);
  });

  it('mounts RemoteComponent exactly once for a single Remote.View', async () => {
    disposeRoot = render(
      () => (
        <RemoteProvider modules={[{ name: 'universal-canvas', url: 'http://localhost:3000' }]}>
          <RemoteView name="universal-canvas" instanceId="main" />
        </RemoteProvider>
      ),
      container,
    );

    // Let the provider's modules-sync effect flush (appSrc becomes defined).
    await Promise.resolve();
    await Promise.resolve();

    expect(countPhase('mount')).toBe(1);
    // Exactly one iframe in the DOM, no ghost.
    expect(container.querySelectorAll('iframe').length).toBe(1);
  });

  // The app wraps <Remote.View> inside <Features.Canvas>, whose logic-wrapper renders
  // children under <Suspense> (web-core). Probe whether a Suspense boundary alone makes
  // RemoteComponent mount twice (the ghost signature: effects ran, not in DOM, no dispose).
  it('under <Suspense>: still exactly one RemoteComponent mount', async () => {
    disposeRoot = render(
      () => (
        <RemoteProvider modules={[{ name: 'universal-canvas', url: 'http://localhost:3000' }]}>
          <Suspense fallback={<span>loading</span>}>
            <RemoteView name="universal-canvas" instanceId="main" />
          </Suspense>
        </RemoteProvider>
      ),
      container,
    );

    await Promise.resolve();
    await Promise.resolve();

    expect(countPhase('mount')).toBe(1);
    expect(countPhase('dispose')).toBe(0);
  });

  // The wrappers registry mounts widgets/pages via lazy() (lazy-imports). lazy() + Suspense
  // is the classic Solid double-instantiation path. Probe it.
  it('under lazy() + <Suspense>: still exactly one RemoteComponent mount', async () => {
    const LazyView = lazy(async () => ({
      default: () => <RemoteView name="universal-canvas" instanceId="main" />,
    }));

    disposeRoot = render(
      () => (
        <RemoteProvider modules={[{ name: 'universal-canvas', url: 'http://localhost:3000' }]}>
          <Suspense fallback={<span>loading</span>}>
            <LazyView />
          </Suspense>
        </RemoteProvider>
      ),
      container,
    );

    // lazy resolution + effect flush
    await new Promise((r) => setTimeout(r, 0));
    await Promise.resolve();

    expect(countPhase('mount')).toBe(1);
    expect(countPhase('dispose')).toBe(0);
  });

  // Disposal contract: when the parent reactive scope swaps the Remote.View out, the
  // old RemoteComponent owner MUST dispose (its onCleanup → transport unsubscribe fires).
  // A "ghost" (mount with no matching dispose) would mean web-remote leaks an owner — this
  // proves it does not, so a ghost observed in-app originates ABOVE this package.
  it('parent <Show> toggle: each mount is matched by a dispose (no ghost from web-remote)', async () => {
    const [show, setShow] = createSignal(true);

    disposeRoot = render(
      () => (
        <RemoteProvider modules={[{ name: 'universal-canvas', url: 'http://localhost:3000' }]}>
          <Show when={show()}>
            <RemoteView name="universal-canvas" instanceId="main" />
          </Show>
        </RemoteProvider>
      ),
      container,
    );

    await Promise.resolve();
    expect(countPhase('mount')).toBe(1);
    expect(countPhase('dispose')).toBe(0);

    setShow(false);
    await Promise.resolve();
    expect(countPhase('dispose')).toBe(1);

    setShow(true);
    await Promise.resolve();
    expect(countPhase('mount')).toBe(2);
    expect(countPhase('dispose')).toBe(1);
  });
});
