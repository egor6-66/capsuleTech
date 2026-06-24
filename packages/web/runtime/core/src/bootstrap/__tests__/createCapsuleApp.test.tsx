/* @vitest-environment jsdom */
/**
 * createCapsuleApp.test.tsx
 *
 * Characterization tests for createCapsuleApp — unified bootstrap helper.
 *
 * NOTE: BaseProviders is mocked (records received props) to isolate orchestration.
 * embedHandshake is mocked so embedded-mode (isEmbedded / readEmbedParams /
 * startHandshake) is driver-controlled; the real handshake/postMessage logic is
 * covered by embedHandshake.test.ts and the merge by embedConfig.test.ts.
 * Integration with the real BaseProviders is covered by the e2e/smoke layer.
 *
 * Contracts:
 *  1-4.  container resolution + disposer.
 *  5-7.  theme injection.
 *  8.    standalone mode (no embed) mounts immediately.
 *  9.    eventSink forwarded.
 *  10.   embedded: defers mount until first config patch.
 *  11.   embedded: host override merged into router config before mount.
 *  12.   embedded: mounts on timeout when no config arrives.
 *  13.   embedded: missing handshake params → mounts immediately on defaults.
 *  14.   embedded: dispose detaches handshake; runtime patch does not remount.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Hoisted shared state for the mocks (vi.mock factories may only touch hoisted refs).
const h = vi.hoisted(() => ({
  embedded: false,
  params: { sessionId: 's1', name: 'app' } as { sessionId: string; name: string } | null,
  onConfig: undefined as ((p: Record<string, unknown>) => void) | undefined,
  detached: false,
  baseProps: [] as Array<Record<string, unknown>>,
}));

vi.mock('../../providers/base', () => ({
  BaseProviders: (props: any) => {
    h.baseProps.push({ ...props });
    const el = document.createElement('div');
    el.setAttribute('data-testid', 'base-providers');
    el.setAttribute('data-basepath', props.basepath ?? '');
    el.setAttribute('data-notfound', props.notFoundRedirect ?? '');
    return el as any;
  },
}));

vi.mock('../embedHandshake', () => ({
  DEFAULT_HANDSHAKE_TIMEOUT_MS: 1500,
  EMBED_PROTOCOL: {
    readyEvent: '__capsule_app_ready__',
    configEvent: '__capsule_remote_config__',
    hostTarget: '__host__',
    query: { session: '__capsule_session', name: '__capsule_name' },
  },
  isEmbedded: () => h.embedded,
  readEmbedParams: () => h.params,
  startHandshake: (opts: any) => {
    h.onConfig = opts.onConfig;
    return () => {
      h.detached = true;
    };
  },
}));

import { createCapsuleApp } from '../createCapsuleApp';

const makeRouteTree = () => ({ id: 'root' }) as any;
const makeAppConfig = (overrides?: any) => ({ router: {}, ...overrides });

const mountedCount = (root: HTMLElement) =>
  root.querySelectorAll('[data-testid="base-providers"]').length;

let container: HTMLElement;

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  document.documentElement.removeAttribute('data-theme');
  // reset hoisted state
  h.embedded = false;
  h.params = { sessionId: 's1', name: 'app' };
  h.onConfig = undefined;
  h.detached = false;
  h.baseProps = [];
});

afterEach(() => {
  document.body.removeChild(container);
  vi.useRealTimers();
});

// ---------------------------------------------------------------------------
// Container resolution + disposer (standalone path)
// ---------------------------------------------------------------------------

describe('createCapsuleApp — container resolution', () => {
  it('mounts to provided HTMLElement', () => {
    const dispose = createCapsuleApp(container, {
      routeTree: makeRouteTree(),
      appConfig: makeAppConfig(),
    });
    expect(typeof dispose).toBe('function');
    expect(mountedCount(container)).toBe(1);
    dispose();
  });

  it('mounts to container by string id', () => {
    container.id = 'test-root';
    const dispose = createCapsuleApp('test-root', {
      routeTree: makeRouteTree(),
      appConfig: makeAppConfig(),
    });
    expect(typeof dispose).toBe('function');
    dispose();
  });

  it('throws when string id not found', () => {
    expect(() =>
      createCapsuleApp('nonexistent-id', { routeTree: makeRouteTree(), appConfig: makeAppConfig() }),
    ).toThrow('nonexistent-id');
  });

  it('throw message mentions createCapsuleApp', () => {
    expect(() =>
      createCapsuleApp('ghost-container', { routeTree: makeRouteTree(), appConfig: makeAppConfig() }),
    ).toThrow('[createCapsuleApp]');
  });
});

describe('createCapsuleApp — disposer', () => {
  it('returns a callable disposer', () => {
    const dispose = createCapsuleApp(container, {
      routeTree: makeRouteTree(),
      appConfig: makeAppConfig(),
    });
    expect(() => dispose()).not.toThrow();
  });

  it('disposer can be called multiple times without throw', () => {
    const dispose = createCapsuleApp(container, {
      routeTree: makeRouteTree(),
      appConfig: makeAppConfig(),
    });
    dispose();
    expect(() => dispose()).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// Theme injection
// ---------------------------------------------------------------------------

describe('createCapsuleApp — theme injection', () => {
  it('sets data-theme="black" by default when not already set', () => {
    createCapsuleApp(container, { routeTree: makeRouteTree(), appConfig: makeAppConfig() })();
    expect(document.documentElement.getAttribute('data-theme')).toBe('black');
  });

  it('sets custom defaultTheme', () => {
    createCapsuleApp(container, {
      routeTree: makeRouteTree(),
      appConfig: makeAppConfig(),
      defaultTheme: 'light',
    })();
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  });

  it('does NOT overwrite existing data-theme', () => {
    document.documentElement.setAttribute('data-theme', 'custom-existing');
    createCapsuleApp(container, { routeTree: makeRouteTree(), appConfig: makeAppConfig() })();
    expect(document.documentElement.getAttribute('data-theme')).toBe('custom-existing');
  });
});

// ---------------------------------------------------------------------------
// Standalone mode
// ---------------------------------------------------------------------------

describe('createCapsuleApp — standalone mode', () => {
  it('mounts immediately with minimal options', () => {
    createCapsuleApp(container, { routeTree: makeRouteTree(), appConfig: makeAppConfig() });
    expect(mountedCount(container)).toBe(1);
  });

  it('forwards eventSink without throwing', () => {
    const eventSink = { send: vi.fn() };
    expect(() =>
      createCapsuleApp(container, {
        routeTree: makeRouteTree(),
        appConfig: makeAppConfig(),
        eventSink,
      })(),
    ).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// Embedded mode (handshake-driven)
// ---------------------------------------------------------------------------

describe('createCapsuleApp — embedded mode', () => {
  it('defers mount until the first config patch arrives', () => {
    h.embedded = true;
    const dispose = createCapsuleApp(container, {
      routeTree: makeRouteTree(),
      appConfig: makeAppConfig(),
    });

    // Not mounted yet — waiting for host config.
    expect(mountedCount(container)).toBe(0);
    expect(typeof h.onConfig).toBe('function');

    h.onConfig?.({ router: { notFoundRedirect: '/from-host' } });
    expect(mountedCount(container)).toBe(1);
    dispose();
  });

  it('merges host override into router config before mount', () => {
    h.embedded = true;
    const dispose = createCapsuleApp(container, {
      routeTree: makeRouteTree(),
      appConfig: makeAppConfig({ router: { notFoundRedirect: '/app-default' } }),
    });

    h.onConfig?.({ router: { notFoundRedirect: '/from-host' } });

    const lastProps = h.baseProps.at(-1);
    expect(lastProps?.notFoundRedirect).toBe('/from-host');
    dispose();
  });

  it('mounts on timeout when no config arrives', () => {
    vi.useFakeTimers();
    h.embedded = true;
    const dispose = createCapsuleApp(container, {
      routeTree: makeRouteTree(),
      appConfig: makeAppConfig(),
      handshakeTimeoutMs: 1500,
    });

    expect(mountedCount(container)).toBe(0);
    vi.advanceTimersByTime(1500);
    expect(mountedCount(container)).toBe(1);
    dispose();
  });

  it('mounts immediately on defaults when handshake params are missing', () => {
    h.embedded = true;
    h.params = null;
    const dispose = createCapsuleApp(container, {
      routeTree: makeRouteTree(),
      appConfig: makeAppConfig(),
    });
    expect(mountedCount(container)).toBe(1);
    dispose();
  });

  it('dispose detaches the handshake; runtime patch does not remount', () => {
    h.embedded = true;
    const dispose = createCapsuleApp(container, {
      routeTree: makeRouteTree(),
      appConfig: makeAppConfig(),
    });

    h.onConfig?.({ router: { notFoundRedirect: '/a' } });
    expect(mountedCount(container)).toBe(1);

    // Second runtime patch re-merges but must not mount a second tree.
    h.onConfig?.({ router: { notFoundRedirect: '/b' } });
    expect(mountedCount(container)).toBe(1);

    dispose();
    expect(h.detached).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Multiple instances
// ---------------------------------------------------------------------------

describe('createCapsuleApp — multiple instances', () => {
  it('two separate containers mount independently', () => {
    const container2 = document.createElement('div');
    document.body.appendChild(container2);

    const dispose1 = createCapsuleApp(container, {
      routeTree: makeRouteTree(),
      appConfig: makeAppConfig(),
    });
    const dispose2 = createCapsuleApp(container2, {
      routeTree: makeRouteTree(),
      appConfig: makeAppConfig(),
    });

    expect(dispose1).toBeDefined();
    expect(dispose2).toBeDefined();
    dispose1();
    dispose2();
    document.body.removeChild(container2);
  });
});
