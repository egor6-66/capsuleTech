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
  onTheme: undefined as ((p: { theme?: string; dark?: boolean }) => void) | undefined,
  detached: false,
  baseProps: [] as Array<Record<string, unknown>>,
  setTheme: vi.fn(),
  setDarkMode: vi.fn(),
}));

// web-style is used ONLY for onTheme application here (ensureTheme sets data-theme
// directly via setAttribute, not via web-style) → safe to fully spy.
vi.mock('@capsuletech/web-style', () => ({
  setTheme: h.setTheme,
  setDarkMode: h.setDarkMode,
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
    themeEvent: '__capsule_theme__',
    mountedEvent: '__capsule_app_mounted__',
    unloadEvent: '__capsule_app_unloading__',
    hostTarget: '__host__',
    query: { session: '__capsule_session', name: '__capsule_name' },
  },
  isEmbedded: () => h.embedded,
  readEmbedParams: () => h.params,
  startHandshake: (opts: any) => {
    h.onConfig = opts.onConfig;
    h.onTheme = opts.onTheme;
    return () => {
      h.detached = true;
    };
  },
}));

import { defineContract } from '../../contract';
import { createHostInbound } from '../../engine/host-bridge';
import {
  buildContractGatedSink,
  buildHostInboundHandler,
  createCapsuleApp,
} from '../createCapsuleApp';

const makeRouteTree = () => ({ id: 'root' }) as any;
const makeAppConfig = (overrides?: any) => ({ router: {}, ...overrides });

const makeContract = () =>
  defineContract((z) => ({
    in: { setMarkers: z.array(z.object({ id: z.number() })) },
    out: { markerClick: z.object({ id: z.number() }) },
  }));

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
  h.onTheme = undefined;
  h.detached = false;
  h.baseProps = [];
  h.setTheme.mockClear();
  h.setDarkMode.mockClear();
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
      createCapsuleApp('nonexistent-id', {
        routeTree: makeRouteTree(),
        appConfig: makeAppConfig(),
      }),
    ).toThrow('nonexistent-id');
  });

  it('throw message mentions createCapsuleApp', () => {
    expect(() =>
      createCapsuleApp('ghost-container', {
        routeTree: makeRouteTree(),
        appConfig: makeAppConfig(),
      }),
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
// Theme-sync (__capsule_theme__) — host theme applied via web-style in embedded mode
// ---------------------------------------------------------------------------

describe('createCapsuleApp — theme-sync (embedded)', () => {
  it('wires onTheme in embedded mode', () => {
    h.embedded = true;
    const dispose = createCapsuleApp(container, {
      routeTree: makeRouteTree(),
      appConfig: makeAppConfig(),
    });
    expect(typeof h.onTheme).toBe('function');
    dispose();
  });

  it('applies host theme + dark via web-style on __capsule_theme__', () => {
    h.embedded = true;
    const dispose = createCapsuleApp(container, {
      routeTree: makeRouteTree(),
      appConfig: makeAppConfig(),
    });

    h.onTheme?.({ theme: 'rose', dark: true });
    expect(h.setTheme).toHaveBeenCalledWith('rose');
    expect(h.setDarkMode).toHaveBeenCalledWith(true);
    dispose();
  });

  it('applies only the provided fields (theme-only / dark-only)', () => {
    h.embedded = true;
    const dispose = createCapsuleApp(container, {
      routeTree: makeRouteTree(),
      appConfig: makeAppConfig(),
    });

    h.onTheme?.({ theme: 'mint' }); // no dark
    expect(h.setTheme).toHaveBeenCalledWith('mint');
    expect(h.setDarkMode).not.toHaveBeenCalled();

    h.setTheme.mockClear();
    h.onTheme?.({ dark: false }); // no theme
    expect(h.setTheme).not.toHaveBeenCalled();
    expect(h.setDarkMode).toHaveBeenCalledWith(false);
    dispose();
  });

  it('re-applies on a subsequent host theme change (runtime re-send)', () => {
    h.embedded = true;
    const dispose = createCapsuleApp(container, {
      routeTree: makeRouteTree(),
      appConfig: makeAppConfig(),
    });

    h.onTheme?.({ theme: 'rose', dark: true });
    h.onTheme?.({ theme: 'mint', dark: false });
    expect(h.setTheme).toHaveBeenLastCalledWith('mint');
    expect(h.setDarkMode).toHaveBeenLastCalledWith(false);
    dispose();
  });
});

// ---------------------------------------------------------------------------
// mounted-signal (__capsule_app_mounted__) — posted after render() in embedded mode
// ---------------------------------------------------------------------------

describe('createCapsuleApp — mounted signal', () => {
  it('posts __capsule_app_mounted__ to window.parent after mount (embedded)', () => {
    h.embedded = true;
    h.params = { sessionId: 'sess-9', name: 'my-app' };
    const postMessage = vi.fn();
    const originalParent = Object.getOwnPropertyDescriptor(window, 'parent');
    Object.defineProperty(window, 'parent', { value: { postMessage }, configurable: true });
    try {
      const dispose = createCapsuleApp(container, {
        routeTree: makeRouteTree(),
        appConfig: makeAppConfig(),
      });

      // Not mounted yet → no signal.
      expect(postMessage).not.toHaveBeenCalled();

      h.onConfig?.({ router: {} }); // first patch → mount() → render → signal
      expect(mountedCount(container)).toBe(1);

      expect(postMessage).toHaveBeenCalledTimes(1);
      const [envelope, targetOrigin] = postMessage.mock.calls[0];
      expect(envelope).toEqual({
        from: 'my-app',
        fromInstance: 'my-app',
        to: '__host__',
        sessionId: 'sess-9',
        eventName: '__capsule_app_mounted__',
      });
      expect(targetOrigin).toBe('*');
      dispose();
    } finally {
      if (originalParent) Object.defineProperty(window, 'parent', originalParent);
    }
  });

  it('does NOT post mounted signal in standalone mode', () => {
    // h.embedded stays false (standalone).
    const postMessage = vi.fn();
    const originalParent = Object.getOwnPropertyDescriptor(window, 'parent');
    Object.defineProperty(window, 'parent', { value: { postMessage }, configurable: true });
    try {
      const dispose = createCapsuleApp(container, {
        routeTree: makeRouteTree(),
        appConfig: makeAppConfig(),
      });
      expect(mountedCount(container)).toBe(1);
      expect(postMessage).not.toHaveBeenCalled();
      dispose();
    } finally {
      if (originalParent) Object.defineProperty(window, 'parent', originalParent);
    }
  });

  it('posts the mounted signal exactly once (mount is idempotent)', () => {
    h.embedded = true;
    h.params = { sessionId: 'sess-1', name: 'app' };
    const postMessage = vi.fn();
    const originalParent = Object.getOwnPropertyDescriptor(window, 'parent');
    Object.defineProperty(window, 'parent', { value: { postMessage }, configurable: true });
    try {
      const dispose = createCapsuleApp(container, {
        routeTree: makeRouteTree(),
        appConfig: makeAppConfig(),
      });

      h.onConfig?.({ router: { notFoundRedirect: '/a' } }); // mounts + signals
      h.onConfig?.({ router: { notFoundRedirect: '/b' } }); // runtime re-merge, no remount

      expect(mountedCount(container)).toBe(1);
      expect(postMessage).toHaveBeenCalledTimes(1);
      dispose();
    } finally {
      if (originalParent) Object.defineProperty(window, 'parent', originalParent);
    }
  });
});

// ---------------------------------------------------------------------------
// unload-signal (__capsule_app_unloading__) — posted on pagehide in embedded mode
// ---------------------------------------------------------------------------

describe('createCapsuleApp — unload signal', () => {
  const unloadEnvelopes = (postMessage: ReturnType<typeof vi.fn>) =>
    postMessage.mock.calls.filter(([m]) => m && m.eventName === '__capsule_app_unloading__');

  it('posts __capsule_app_unloading__ to window.parent on pagehide (embedded)', () => {
    h.embedded = true;
    h.params = { sessionId: 'sess-7', name: 'my-app' };
    const postMessage = vi.fn();
    const originalParent = Object.getOwnPropertyDescriptor(window, 'parent');
    Object.defineProperty(window, 'parent', { value: { postMessage }, configurable: true });
    try {
      const dispose = createCapsuleApp(container, {
        routeTree: makeRouteTree(),
        appConfig: makeAppConfig(),
      });

      window.dispatchEvent(new Event('pagehide'));

      const unloads = unloadEnvelopes(postMessage);
      expect(unloads).toHaveLength(1);
      expect(unloads[0][0]).toEqual({
        from: 'my-app',
        fromInstance: 'my-app',
        to: '__host__',
        sessionId: 'sess-7',
        eventName: '__capsule_app_unloading__',
      });
      expect(unloads[0][1]).toBe('*');
      dispose();
    } finally {
      if (originalParent) Object.defineProperty(window, 'parent', originalParent);
    }
  });

  it('does NOT post unload signal in standalone mode', () => {
    // h.embedded stays false → no pagehide listener attached.
    const postMessage = vi.fn();
    const originalParent = Object.getOwnPropertyDescriptor(window, 'parent');
    Object.defineProperty(window, 'parent', { value: { postMessage }, configurable: true });
    try {
      const dispose = createCapsuleApp(container, {
        routeTree: makeRouteTree(),
        appConfig: makeAppConfig(),
      });

      window.dispatchEvent(new Event('pagehide'));

      expect(unloadEnvelopes(postMessage)).toHaveLength(0);
      dispose();
    } finally {
      if (originalParent) Object.defineProperty(window, 'parent', originalParent);
    }
  });

  it('disposer removes the pagehide listener (no unload after dispose)', () => {
    h.embedded = true;
    h.params = { sessionId: 'sess-1', name: 'app' };
    const postMessage = vi.fn();
    const originalParent = Object.getOwnPropertyDescriptor(window, 'parent');
    Object.defineProperty(window, 'parent', { value: { postMessage }, configurable: true });
    try {
      const dispose = createCapsuleApp(container, {
        routeTree: makeRouteTree(),
        appConfig: makeAppConfig(),
      });

      dispose();
      window.dispatchEvent(new Event('pagehide'));

      expect(unloadEnvelopes(postMessage)).toHaveLength(0);
    } finally {
      if (originalParent) Object.defineProperty(window, 'parent', originalParent);
    }
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

// ---------------------------------------------------------------------------
// ADR 060 D1 — app→host contract-gated sink (outbound)
// ---------------------------------------------------------------------------

describe('buildContractGatedSink (app→host, ADR 060 D1)', () => {
  const params = { sessionId: 'sess-1', name: 'my-app' };

  const withParentSpy = (fn: (postMessage: ReturnType<typeof vi.fn>) => void) => {
    const postMessage = vi.fn();
    const originalParent = Object.getOwnPropertyDescriptor(window, 'parent');
    Object.defineProperty(window, 'parent', { value: { postMessage }, configurable: true });
    try {
      fn(postMessage);
    } finally {
      if (originalParent) Object.defineProperty(window, 'parent', originalParent);
    }
  };

  it('forwards a declared out event with a valid payload', () => {
    withParentSpy((postMessage) => {
      const sink = buildContractGatedSink(params, makeContract());
      sink.send('markerClick', { id: 7 });

      expect(postMessage).toHaveBeenCalledTimes(1);
      const [envelope, targetOrigin] = postMessage.mock.calls[0];
      expect(envelope).toEqual({
        from: 'my-app',
        fromInstance: 'my-app',
        to: '__host__',
        sessionId: 'sess-1',
        eventName: 'markerClick',
        payload: { id: 7 },
      });
      expect(targetOrigin).toBe('*');
    });
  });

  it('does NOT forward an undeclared event (gate)', () => {
    withParentSpy((postMessage) => {
      const sink = buildContractGatedSink(params, makeContract());
      sink.send('notInContract', { id: 1 });
      expect(postMessage).not.toHaveBeenCalled();
    });
  });

  it('drops a declared event with an invalid payload (+warn)', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    withParentSpy((postMessage) => {
      const sink = buildContractGatedSink(params, makeContract());
      sink.send('markerClick', { id: 'not-a-number' });
      expect(postMessage).not.toHaveBeenCalled();
      expect(warn).toHaveBeenCalled();
    });
    warn.mockRestore();
  });

  it('is a no-op when window is undefined (SSR guard)', () => {
    const sink = buildContractGatedSink(params, makeContract());
    const originalWindow = globalThis.window;
    // @ts-expect-error — simulate SSR (no window)
    delete globalThis.window;
    try {
      expect(() => sink.send('markerClick', { id: 1 })).not.toThrow();
    } finally {
      globalThis.window = originalWindow;
    }
  });
});

// ---------------------------------------------------------------------------
// ADR 060 D1 — host→app inbound handler
// ---------------------------------------------------------------------------

describe('buildHostInboundHandler (host→app, ADR 060 D1)', () => {
  const params = { sessionId: 'sess-1', name: 'my-app' };

  const makeInbound = () => {
    const dispatch = vi.fn();
    const inbound = createHostInbound();
    inbound.register(dispatch);
    return { inbound, dispatch };
  };

  const msg = (data: unknown) => ({ data }) as MessageEvent;

  it('injects a valid declared in event into the inbound channel (parsed value)', () => {
    const { inbound, dispatch } = makeInbound();
    const handler = buildHostInboundHandler(params, makeContract(), inbound);

    handler(
      msg({ sessionId: 'sess-1', to: 'my-app', eventName: 'setMarkers', payload: [{ id: 1 }] }),
    );

    expect(dispatch).toHaveBeenCalledWith('setMarkers', [{ id: 1 }]);
  });

  it('ignores a message with a foreign sessionId', () => {
    const { inbound, dispatch } = makeInbound();
    const handler = buildHostInboundHandler(params, makeContract(), inbound);
    handler(msg({ sessionId: 'other', eventName: 'setMarkers', payload: [{ id: 1 }] }));
    expect(dispatch).not.toHaveBeenCalled();
  });

  it('silently drops an undeclared event (loose coupling)', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { inbound, dispatch } = makeInbound();
    const handler = buildHostInboundHandler(params, makeContract(), inbound);
    handler(msg({ sessionId: 'sess-1', eventName: 'unknownEvent', payload: {} }));
    expect(dispatch).not.toHaveBeenCalled();
    expect(warn).not.toHaveBeenCalled(); // undeclared = silent, not a warning
    warn.mockRestore();
  });

  it('drops a declared event with an invalid payload (+warn)', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { inbound, dispatch } = makeInbound();
    const handler = buildHostInboundHandler(params, makeContract(), inbound);
    handler(msg({ sessionId: 'sess-1', eventName: 'setMarkers', payload: 'not-an-array' }));
    expect(dispatch).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });
});

// ---------------------------------------------------------------------------
// ADR 060 D1 — bridge wiring in createCapsuleApp (embedded + contract)
// ---------------------------------------------------------------------------

describe('createCapsuleApp — root-event-bus wiring', () => {
  const countMessageListeners = (spy: ReturnType<typeof vi.spyOn>) =>
    spy.mock.calls.filter((call: any[]) => call[0] === 'message').length;

  it('attaches a host→app message listener in embedded mode with a contract', () => {
    h.embedded = true;
    h.params = { sessionId: 's1', name: 'app' };
    const addSpy = vi.spyOn(window, 'addEventListener');
    const removeSpy = vi.spyOn(window, 'removeEventListener');
    try {
      const dispose = createCapsuleApp(container, {
        routeTree: makeRouteTree(),
        appConfig: makeAppConfig(),
        contract: makeContract(),
      });
      expect(countMessageListeners(addSpy)).toBe(1);

      dispose();
      expect(countMessageListeners(removeSpy)).toBe(1);
    } finally {
      addSpy.mockRestore();
      removeSpy.mockRestore();
    }
  });

  it('does NOT attach a message listener without a contract (bridge off)', () => {
    h.embedded = true;
    h.params = { sessionId: 's1', name: 'app' };
    const addSpy = vi.spyOn(window, 'addEventListener');
    try {
      const dispose = createCapsuleApp(container, {
        routeTree: makeRouteTree(),
        appConfig: makeAppConfig(),
      });
      expect(countMessageListeners(addSpy)).toBe(0);
      dispose();
    } finally {
      addSpy.mockRestore();
    }
  });

  it('does NOT attach a message listener in standalone mode (with contract)', () => {
    // h.embedded stays false.
    const addSpy = vi.spyOn(window, 'addEventListener');
    try {
      const dispose = createCapsuleApp(container, {
        routeTree: makeRouteTree(),
        appConfig: makeAppConfig(),
        contract: makeContract(),
      });
      expect(countMessageListeners(addSpy)).toBe(0);
      dispose();
    } finally {
      addSpy.mockRestore();
    }
  });
});
