import type { Plugin } from 'vite';
import { describe, expect, it } from 'vitest';
import { AppSourceServePlugin } from '../appSourceServe';

/**
 * Tests for AppSourceServePlugin.
 *
 * This plugin rewrites `/src/*` requests to `/@fs/<appRoot>/src/*` so that
 * remote-app manifests can reference `/src/standalone.tsx` as a stable,
 * portable entry URL instead of `/@fs/D:/absolute/...` hacks.
 *
 * See: docs/_meta/briefs/builders-app-as-remote-dev-gaps-2026-06-19.md Phase 2
 *
 * Coverage:
 * ── plugin identity ─────────────────────────────────────────────────────────
 *  - plugin has the correct name
 *  - configureServer hook is defined
 *
 * ── request rewrite ──────────────────────────────────────────────────────────
 *  - /src/standalone.tsx → /@fs/<appRoot>/src/standalone.tsx
 *  - /src/main.tsx (root /src request) → /@fs/<appRoot>/src/main.tsx
 *  - empty sub-path (bare /src) → /@fs/<appRoot>/src
 *  - deep path /src/features/auth.ts → /@fs/<appRoot>/src/features/auth.ts
 *  - next() is always called (plugin does not terminate the chain)
 *  - existing req.url is replaced, not appended
 */

// Minimal mock of Vite's Connect server.middlewares
function makeMiddlewareMock() {
  let registeredMiddleware: ((req: any, res: any, next: () => void) => void) | null = null;

  const use = (path: string, fn: (req: any, res: any, next: () => void) => void) => {
    // Only record the first registration (the plugin registers one)
    if (registeredMiddleware === null) {
      registeredMiddleware = fn;
    }
  };

  const invoke = (subPath: string) => {
    if (!registeredMiddleware) throw new Error('No middleware registered');
    const req = { url: subPath };
    let nextCalled = false;
    registeredMiddleware(req, {}, () => {
      nextCalled = true;
    });
    return { req, nextCalled };
  };

  return { use, invoke };
}

function buildPlugin(appRoot: string) {
  return AppSourceServePlugin({ appRoot }) as Plugin & {
    configureServer: (server: any) => void;
  };
}

describe('AppSourceServePlugin — identity', () => {
  it('has the correct plugin name', () => {
    const plugin = AppSourceServePlugin({ appRoot: '/apps/remote-hello' });
    expect(plugin.name).toBe('capsule:app-source-serve');
  });

  it('defines configureServer hook', () => {
    const plugin = AppSourceServePlugin({ appRoot: '/apps/remote-hello' });
    expect(typeof plugin.configureServer).toBe('function');
  });
});

describe('AppSourceServePlugin — request rewrite', () => {
  // Use a Windows-style appRoot without a leading slash — typical real value
  // from capsuleConfig (join() on Windows returns 'D:/...' which starts with a drive letter).
  // We test Unix-leading-slash stripping separately in the "different appRoot values" group.
  const appRoot = 'D:/projects/capsule/apps/remote-hello';

  function setup() {
    const mock = makeMiddlewareMock();
    const plugin = buildPlugin(appRoot);
    plugin.configureServer({ middlewares: mock });
    return mock;
  }

  it('rewrites /src/standalone.tsx to /@fs/<appRoot>/src/standalone.tsx', () => {
    const { invoke } = setup();
    const { req } = invoke('/standalone.tsx');
    expect(req.url).toBe(`/@fs/${appRoot}/src/standalone.tsx`);
  });

  it('rewrites /src/main.tsx', () => {
    const { invoke } = setup();
    const { req } = invoke('/main.tsx');
    expect(req.url).toBe(`/@fs/${appRoot}/src/main.tsx`);
  });

  it('handles empty sub-path (bare mount)', () => {
    const { invoke } = setup();
    const { req } = invoke('');
    expect(req.url).toBe(`/@fs/${appRoot}/src`);
  });

  it('handles deep nested path', () => {
    const { invoke } = setup();
    const { req } = invoke('/features/auth/loginFeature.ts');
    expect(req.url).toBe(`/@fs/${appRoot}/src/features/auth/loginFeature.ts`);
  });

  it('always calls next() to continue the middleware chain', () => {
    const { invoke } = setup();
    const { nextCalled } = invoke('/standalone.tsx');
    expect(nextCalled).toBe(true);
  });

  it('replaces req.url entirely (does not append to existing)', () => {
    const { invoke } = setup();
    // req.url starts as '/standalone.tsx', must be fully replaced, not appended
    const { req } = invoke('/standalone.tsx');
    expect(req.url).not.toContain('/standalone.tsx/@fs');
    expect(req.url).not.toContain('/@fs/@fs');
  });
});

describe('AppSourceServePlugin — different appRoot values', () => {
  it('works with Windows-style absolute paths', () => {
    const mock = makeMiddlewareMock();
    const plugin = buildPlugin('D:/CODING/projects/my/capsule/apps/remote-hello');
    plugin.configureServer({ middlewares: mock });
    const { req } = mock.invoke('/standalone.tsx');
    expect(req.url).toBe('/@fs/D:/CODING/projects/my/capsule/apps/remote-hello/src/standalone.tsx');
  });

  it('works with Unix absolute paths', () => {
    const mock = makeMiddlewareMock();
    const plugin = buildPlugin('/home/user/capsule/apps/remote-hello');
    plugin.configureServer({ middlewares: mock });
    const { req } = mock.invoke('/standalone.tsx');
    expect(req.url).toBe('/@fs/home/user/capsule/apps/remote-hello/src/standalone.tsx');
  });
});
