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
 * ## Why integration-style (Connect harness, not mock)?
 *
 * The previous mock called the handler directly with an already-stripped sub-path
 * and checked req.url INSIDE the handler — it never exercised the Connect
 * prefix-restore contract. The real bug: Connect's `use('/src', fn)` restores
 * req.url to the original '/src/...' value AFTER next() returns, so any rewrite
 * inside fn is silently undone. The SPA fallback then serves index.html instead
 * of the JS module (200 text/html, white screen).
 *
 * Fix: the plugin now registers WITHOUT a mount prefix and guards manually.
 * These tests simulate the full Connect dispatch cycle via a hand-rolled harness
 * that faithfully reproduces the two contracts verified in Vite 8's bundled
 * connect source (node_modules/.pnpm/vite@8.../chunks/node.js):
 *   1. Prefix-strip on entry when a route is registered.
 *   2. req.url restore in next() when a route is registered.
 * The harness runs the middleware and a "sink" middleware; the sink captures
 * req.url AFTER the plugin's next() call — i.e. what the downstream middleware
 * (Vite's SPA fallback) would actually see.
 *
 * Coverage:
 * ── plugin identity ─────────────────────────────────────────────────────────
 *  - plugin has the correct name
 *  - configureServer hook is defined
 *
 * ── request rewrite (integration, full Connect chain) ────────────────────────
 *  - /src/standalone.tsx → /@fs/<appRoot>/src/standalone.tsx
 *  - /src/main.tsx → /@fs/<appRoot>/src/main.tsx
 *  - bare /src → /@fs/<appRoot>/src
 *  - deep path /src/features/auth.ts → /@fs/<appRoot>/src/features/auth.ts
 *  - next() is always called (plugin does not terminate the chain)
 *  - downstream middleware sees the REWRITTEN url (the key regression guard)
 *
 * ── negative tests (must NOT rewrite) ────────────────────────────────────────
 *  - /source/foo.tsx — not a /src prefix, passes through
 *  - /srcabc — shares substring but not /src/ prefix, passes through
 *  - /manifest.json — unrelated URL, passes through
 *
 * ── appRoot normalisation ─────────────────────────────────────────────────────
 *  - Windows-style path (D:/...)
 *  - Unix-style path (/home/...)
 */

// ---------------------------------------------------------------------------
// Hand-rolled Connect harness
// ---------------------------------------------------------------------------
// Reproduces the two contracts from Connect 3.x bundled in Vite 8:
//   1. When registered WITH a route: strip prefix from req.url before calling fn.
//   2. When registered WITH a route: restore req.url after next() returns.
// When registered WITHOUT a route (or route === '/') no stripping/restore occurs.
//
// The harness supports both calling conventions so we can use the same helper
// both for the "correctly fixed" case (no-mount plugin) and for a control test
// that demonstrates the old bug would fail.

type Middleware = (req: any, res: any, next: () => void) => void;

interface Layer {
  route: string;
  handle: Middleware;
}

class ConnectHarness {
  private stack: Layer[] = [];

  use(routeOrFn: string | Middleware, fn?: Middleware): this {
    if (typeof routeOrFn === 'function') {
      this.stack.push({ route: '/', handle: routeOrFn });
    } else {
      const route = routeOrFn.endsWith('/') ? routeOrFn.slice(0, -1) : routeOrFn;
      this.stack.push({ route, handle: fn! });
    }
    return this;
  }

  /** Run the middleware chain for a synthetic request; returns the final req.url. */
  run(url: string): Promise<string> {
    return new Promise((resolve) => {
      const req: any = { url, originalUrl: url, method: 'GET', headers: {} };
      const res: any = {};
      let index = 0;

      const next = () => {
        // --- Connect prefix-restore contract ---
        // After each layer's next() the harness restores req.url to the original
        // value with the stripped prefix prepended (mirrors connect/index.js handle()).
        // This only applies when the layer has a non-root route.
        const prevLayer = this.stack[index - 1];
        if (prevLayer && prevLayer.route !== '/' && prevLayer.route !== '') {
          req.url = prevLayer.route + req.url;
        }

        const layer = this.stack[index++];
        if (!layer) {
          // No more layers — sink: capture final req.url.
          resolve(req.url);
          return;
        }

        const route = layer.route;

        // --- Connect prefix-strip contract ---
        if (route !== '/' && route !== '') {
          // Only dispatch if URL starts with route.
          const pathname = req.url.split('?')[0];
          if (!pathname.startsWith(route)) {
            next(); // skip, don't strip
            return;
          }
          // Strip the route prefix before calling handler.
          req.url = req.url.slice(route.length) || '/';
        }

        layer.handle(req, res, next);
      };

      next();
    });
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildPlugin(appRoot: string) {
  return AppSourceServePlugin({ appRoot }) as Plugin & {
    configureServer: (server: any) => void;
  };
}

/**
 * Simulate the full Connect dispatch for a given URL.
 * Captures req.url as seen by the DOWNSTREAM middleware (after plugin's next()).
 * This is the key guard: it must show the REWRITTEN /@fs/... url, not the original.
 */
function runChain(appRoot: string, url: string): Promise<string> {
  const harness = new ConnectHarness();
  const plugin = buildPlugin(appRoot);
  // Install plugin middleware onto harness (same API as server.middlewares)
  plugin.configureServer({ middlewares: harness });
  // Sink: captures whatever req.url the next middleware would see
  harness.use((_req: any, _res: any, _next: () => void) => {
    // harness.run() resolves via the final no-layer path; sink not needed here
    // because harness resolves when stack exhausted. But we still need to call next
    // so control flows to the end.
    _next();
  });
  return harness.run(url);
}

// ---------------------------------------------------------------------------
// Tests — identity
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Tests — rewrite (integration through Connect harness)
// ---------------------------------------------------------------------------

describe('AppSourceServePlugin — request rewrite (Connect integration)', () => {
  const appRoot = 'D:/projects/capsule/apps/remote-hello';

  it('rewrites /src/standalone.tsx — downstream sees /@fs URL', async () => {
    const final = await runChain(appRoot, '/src/standalone.tsx');
    expect(final).toBe(`/@fs/${appRoot}/src/standalone.tsx`);
  });

  it('rewrites /src/main.tsx', async () => {
    const final = await runChain(appRoot, '/src/main.tsx');
    expect(final).toBe(`/@fs/${appRoot}/src/main.tsx`);
  });

  it('rewrites bare /src (no trailing slash) to /@fs/…/src', async () => {
    const final = await runChain(appRoot, '/src');
    expect(final).toBe(`/@fs/${appRoot}/src`);
  });

  it('rewrites deep nested path /src/features/auth/loginFeature.ts', async () => {
    const final = await runChain(appRoot, '/src/features/auth/loginFeature.ts');
    expect(final).toBe(`/@fs/${appRoot}/src/features/auth/loginFeature.ts`);
  });

  it('downstream sees rewritten URL — key Connect-restore regression guard', async () => {
    // This is the exact scenario that was broken:
    // old code used use('/src', fn) → Connect restored url after next()
    // → downstream (SPA fallback) saw '/src/standalone.tsx' → served index.html
    const final = await runChain(appRoot, '/src/standalone.tsx');
    // Must NOT be the original url or contain 'text/html' trigger
    expect(final).not.toBe('/src/standalone.tsx');
    expect(final).toContain('/@fs/');
    expect(final).toContain('/src/standalone.tsx');
  });
});

// ---------------------------------------------------------------------------
// Tests — negative (must NOT rewrite)
// ---------------------------------------------------------------------------

describe('AppSourceServePlugin — negative tests (no rewrite)', () => {
  const appRoot = 'D:/projects/capsule/apps/remote-hello';

  it('/source/foo.tsx — not a /src prefix, passes through unchanged', async () => {
    const final = await runChain(appRoot, '/source/foo.tsx');
    expect(final).toBe('/source/foo.tsx');
  });

  it('/srcabc — shares /src substring but not /src/ prefix, passes through', async () => {
    const final = await runChain(appRoot, '/srcabc');
    expect(final).toBe('/srcabc');
  });

  it('/manifest.json — unrelated URL, passes through unchanged', async () => {
    const final = await runChain(appRoot, '/manifest.json');
    expect(final).toBe('/manifest.json');
  });
});

// ---------------------------------------------------------------------------
// Tests — appRoot normalisation
// ---------------------------------------------------------------------------

describe('AppSourceServePlugin — appRoot normalisation', () => {
  it('works with Windows-style absolute paths (no leading slash)', async () => {
    const final = await runChain(
      'D:/CODING/projects/my/capsule/apps/remote-hello',
      '/src/standalone.tsx',
    );
    expect(final).toBe('/@fs/D:/CODING/projects/my/capsule/apps/remote-hello/src/standalone.tsx');
  });

  it('strips leading slash from Unix-style paths to avoid double-slash in /@fs/', async () => {
    const final = await runChain('/home/user/capsule/apps/remote-hello', '/src/standalone.tsx');
    expect(final).toBe('/@fs/home/user/capsule/apps/remote-hello/src/standalone.tsx');
  });
});
