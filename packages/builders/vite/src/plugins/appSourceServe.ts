import type { Plugin } from 'vite';

/**
 * AppSourceServePlugin — rewrite `/src/*` requests to `/@fs/<appRoot>/src/*`.
 *
 * ## Why this exists
 *
 * `capsuleConfig` sets Vite `root` to `<appRoot>/.capsule/` (a generated
 * directory). Vite resolves URLs relative to its root, so `/src/standalone.tsx`
 * maps to `<appRoot>/.capsule/src/standalone.tsx` — which doesn't exist. The
 * real source lives at `<appRoot>/src/standalone.tsx`.
 *
 * For in-app compilation this works transparently: scaffold-generated
 * `.capsule/index.ts` uses `../src/...` relative imports, which Vite resolves
 * through the filesystem. But external consumers (e.g. a manifest `entry` field
 * or a cross-app `<Remote>` pointing to a dev-server) need a **stable, relative,
 * portable** URL like `/src/standalone.tsx` rather than `/@fs/D:/...` absolute
 * filesystem paths that break on other machines.
 *
 * This plugin intercepts `/src/*` requests and rewrites them to
 * `/@fs/<appRoot>/src/*`, which Vite already knows how to serve (same mechanism
 * used by in-app imports). The rewrite stays inside Vite's `server.fs.allow`
 * list (appRoot is part of allow-list by default).
 *
 * ## Phase 1a / Variant B note (TEMPORARY)
 *
 * This plugin is a **known temporary workaround**. The canonical fix is
 * "Variant B": change Vite `root` from `.capsule/` to `<appRoot>` and treat
 * `.capsule/` as a regular codegen output dir. With Variant B, `/src/*` resolves
 * correctly without this middleware.
 *
 * **Removal condition:** delete this plugin when Variant B lands in a separate
 * ADR (working title: "Vite root = appRoot"). Track the ADR in
 * `docs/01-architecture/adr/` and update `OWNERSHIP.md` + `capsuleConfig.ts`
 * plugin array at that time.
 *
 * Ref: docs/_meta/briefs/builders-app-as-remote-dev-gaps-2026-06-19.md Phase 2
 * Ref: docs/01-architecture/adr/053-app-as-remote-symmetry-and-config-channel.md
 */
export const AppSourceServePlugin = (opts: { appRoot: string }): Plugin => ({
  name: 'capsule:app-source-serve',
  configureServer(server) {
    // Intercept requests for `/src/*` and rewrite to `/@fs/<appRoot>/src/*`.
    // This makes `/src/standalone.tsx` a stable, portable entry URL for
    // remote-app manifests (ADR-053 §7 demo flow).
    //
    // We register this middleware BEFORE Vite's built-in transform middleware
    // (use() without index inserts at the end of the stack, but Vite evaluates
    // middlewares sequentially and our rewrite happens before the SPA fallback
    // that would 200 the request with index.html).
    server.middlewares.use('/src', (req, _res, next) => {
      // req.url under '/src' mount is the sub-path after '/src' (could be '' or '/standalone.tsx').
      const subPath = req.url ?? '';
      // Normalise appRoot for the /@fs/ URL scheme:
      //   Windows: 'D:/...'  → '/@fs/D:/...'   (no leading slash on appRoot)
      //   Unix:    '/home/..' → '/@fs/home/..'  (strip leading slash to avoid '/@fs//home/..')
      // Vite's own fs-serve middleware strips the leading slash the same way.
      const fsRoot = opts.appRoot.startsWith('/') ? opts.appRoot.slice(1) : opts.appRoot;
      req.url = `/@fs/${fsRoot}/src${subPath}`;
      next();
    });
  },
});
