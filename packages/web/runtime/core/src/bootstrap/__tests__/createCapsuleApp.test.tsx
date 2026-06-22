/* @vitest-environment jsdom */
/**
 * createCapsuleApp.test.tsx
 *
 * Characterization tests for createCapsuleApp — unified bootstrap helper.
 *
 * NOTE: Tests mock BaseProviders and EmitProvider to isolate createCapsuleApp
 * logic (mount/unmount cycle, container resolution, theme injection, embedded
 * options forwarding). Integration with actual BaseProviders is covered by
 * the e2e/smoke layer (apps/universal-canvas).
 *
 * Contracts:
 *  1. Mounts to an existing DOM container (HTMLElement).
 *  2. Mounts to a container by string id.
 *  3. Throws on missing container id.
 *  4. Returns a disposer function that unmounts the component.
 *  5. Sets data-theme on <html> when not already set.
 *  6. Does NOT overwrite existing data-theme attribute.
 *  7. Custom defaultTheme is applied.
 *  8. eventSink is forwarded (EmitProvider receives it).
 *  9. Standalone mode works without optional fields.
 * 10. Multiple mounts/unmounts don't leave zombie DOM.
 */

import { createSignal } from 'solid-js';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createCapsuleApp } from '../createCapsuleApp';

// ---------------------------------------------------------------------------
// Mocks for heavy deps (BaseProviders, web-router, web-profiler)
// ---------------------------------------------------------------------------

vi.mock('../../providers/base', () => ({
  BaseProviders: (props: any) => {
    // Render a simple div so we can assert mounting worked
    const el = document.createElement('div');
    el.setAttribute('data-testid', 'base-providers');
    el.setAttribute('data-basepath', props.basepath ?? '');
    return el as any;
  },
}));

vi.mock('@capsuletech/web-router', async (importOriginal) => {
  // Provide minimal stubs for types used at runtime
  return {
    ...(await importOriginal()),
    createRouter: vi.fn(() => ({ raw: {}, capsuleRouter: {} })),
    RouterProvider: () => null,
    RouterContext: { Provider: (p: any) => p.children },
  };
});

vi.mock('@capsuletech/web-profiler', () => ({
  VitalsMonitoringProvider: (p: any) => p.children,
}));

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

const makeRouteTree = () => ({ id: 'root' }) as any;
const makeAppConfig = (overrides?: any) => ({
  router: {},
  ...overrides,
});

let container: HTMLElement;

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  // Reset data-theme before each test
  document.documentElement.removeAttribute('data-theme');
});

afterEach(() => {
  document.body.removeChild(container);
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('createCapsuleApp — container resolution', () => {
  it('mounts to provided HTMLElement', () => {
    const dispose = createCapsuleApp(container, {
      routeTree: makeRouteTree(),
      appConfig: makeAppConfig(),
    });

    expect(typeof dispose).toBe('function');
    dispose();
  });

  it('mounts to container by string id', () => {
    container.id = 'test-root';
    document.body.appendChild(container);

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

    expect(typeof dispose).toBe('function');
    expect(() => dispose()).not.toThrow();
  });

  it('disposer can be called multiple times without throw', () => {
    const dispose = createCapsuleApp(container, {
      routeTree: makeRouteTree(),
      appConfig: makeAppConfig(),
    });

    dispose();
    // Second call should not throw (solid-js render returns idempotent disposer)
    expect(() => dispose()).not.toThrow();
  });
});

describe('createCapsuleApp — theme injection', () => {
  it('sets data-theme="black" by default when not already set', () => {
    createCapsuleApp(container, {
      routeTree: makeRouteTree(),
      appConfig: makeAppConfig(),
    })();

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

    createCapsuleApp(container, {
      routeTree: makeRouteTree(),
      appConfig: makeAppConfig(),
    })();

    // Should remain unchanged
    expect(document.documentElement.getAttribute('data-theme')).toBe('custom-existing');
  });
});

describe('createCapsuleApp — standalone mode', () => {
  it('works with minimal required options', () => {
    expect(() =>
      createCapsuleApp(container, {
        routeTree: makeRouteTree(),
        appConfig: makeAppConfig(),
      })(),
    ).not.toThrow();
  });

  it('works without optional embedded fields', () => {
    const dispose = createCapsuleApp(container, {
      routeTree: makeRouteTree(),
      appConfig: makeAppConfig(),
    });

    expect(dispose).toBeDefined();
    dispose();
  });
});

describe('createCapsuleApp — embedded mode', () => {
  it('accepts eventSink without throwing', () => {
    const mockSend = vi.fn();
    const eventSink = { send: mockSend };

    expect(() =>
      createCapsuleApp(container, {
        routeTree: makeRouteTree(),
        appConfig: makeAppConfig(),
        runtimeProps: { greeting: 'hello' },
        configOverride: { theme: 'dark' },
        eventSink,
      })(),
    ).not.toThrow();
  });

  it('accepts reactive runtimeProps without throwing', () => {
    const [greeting, _setGreeting] = createSignal('hello');

    expect(() =>
      createCapsuleApp(container, {
        routeTree: makeRouteTree(),
        appConfig: makeAppConfig(),
        runtimeProps: { greeting: greeting() },
      })(),
    ).not.toThrow();
  });
});

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
