import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
} from 'node:fs';
import { dirname, extname, join, resolve } from 'node:path';
import type { Plugin } from 'vite';

/**
 * ImportMapPlugin — ADR 057 Phase 1A write-side.
 *
 * Three responsibilities:
 *   1. `transformIndexHtml` — inject `<script type="importmap">` into every
 *      .capsule/index.html response (dev + build) with pinned absolute URLs
 *      for shared singleton deps. Browser-native ESM dedup mechanism.
 *   2. `configureServer` — dev middleware that serves `/_shared/<pkg>@<version>/<file>`
 *      from the app's node_modules. Real ESM bundles, no proxy modules.
 *   3. `closeBundle` — at build time, copy each shared pkg's full directory
 *      (excluding nested node_modules) into `dist/_shared/<pkg>@<version>/` so
 *      the production bundle is self-contained.
 *
 * `SHARED_DEPS` is the canonical singleton list per ADR 057 §D1. Hardcoded for
 * Phase 1; user-override surface is Phase 2.
 *
 * @see docs/01-architecture/adr/057-web-remote-import-maps-native-esm.md
 */

/**
 * Canonical shared singleton dependencies. Exported so [[adr-057-phase1-web-remote]]
 * (owner-remote) consumes the same list for merge logic in `<Remote.Provider>`.
 */
export const SHARED_DEPS = [
  'solid-js',
  'solid-js/web',
  'solid-js/store',
  '@capsuletech/web-core',
  '@capsuletech/web-router',
  '@capsuletech/web-state',
  '@capsuletech/web-ui',
] as const;

export type SharedDep = (typeof SHARED_DEPS)[number];

export interface IImportMapPluginOptions {
  appRoot: string;
  workspaceRoot: string;
}

/** Resolved descriptor for one entry in {@link SHARED_DEPS}. */
export interface IResolvedShared {
  /** The full entry as given in SHARED_DEPS, e.g. `solid-js/web`. */
  entry: string;
  /** Base package name, e.g. `solid-js` for `solid-js/web`. */
  pkg: string;
  /** Package root directory in node_modules. */
  pkgRoot: string;
  /** Version from the package.json at pkgRoot. */
  version: string;
  /** Absolute path of the resolved entry file. */
  resolvedFile: string;
  /** Entry file path relative to pkgRoot (forward slashes), e.g. `dist/solid.js`. */
  relPath: string;
  /** Import-map target URL: `/_shared/<pkg>@<version>/<relPath>`. */
  url: string;
}

/** Split an entry into base pkg + subpath. Handles `@scope/name/subpath`. */
function splitPkgAndSubpath(entry: string): { pkg: string; subpath: string } {
  if (entry.startsWith('@')) {
    const segments = entry.split('/');
    return {
      pkg: `${segments[0]}/${segments[1]}`,
      subpath: segments.slice(2).join('/'),
    };
  }
  const segments = entry.split('/');
  return { pkg: segments[0], subpath: segments.slice(1).join('/') };
}

/**
 * Walk up from `fromDir` looking for `node_modules/<pkg>/package.json`. Returns
 * the pkg root + version when found. Uses pure FS lookup (no `require.resolve`)
 * because workspace packages with `exports.import`-only maps cause CJS resolve
 * to throw `No "exports" main defined` — and we need to find them anyway.
 */
function findPkgRoot(pkg: string, fromDir: string): { pkgRoot: string; version: string } | null {
  let dir = resolve(fromDir);
  while (true) {
    const pkgJsonPath = join(dir, 'node_modules', pkg, 'package.json');
    if (existsSync(pkgJsonPath)) {
      try {
        const parsed = JSON.parse(readFileSync(pkgJsonPath, 'utf-8')) as { version?: string };
        return { pkgRoot: dirname(pkgJsonPath), version: parsed.version ?? '0.0.0' };
      } catch {
        return null;
      }
    }
    const parent = dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}

/**
 * Browser-ESM resolution conditions, in priority order. Matches the precedent
 * in `capsuleConfig.ts` (`resolve.conditions = ['solid', 'browser', 'import']`)
 * with `module` + `default` appended as legacy/fallback. Crucially excludes
 * `require` / `node` so we never land on a CJS server bundle (e.g. solid-js
 * `./dist/server.cjs`).
 */
const BROWSER_ESM_CONDITIONS = ['solid', 'browser', 'import', 'module', 'default'] as const;

/**
 * Walk a single exports node (the value under a subpath key, or a leaf string)
 * picking the first available condition from the priority list. Recurses into
 * nested condition maps. Returns null when no acceptable branch is found.
 */
function walkConditions(node: unknown, conditions: readonly string[]): string | null {
  if (typeof node === 'string') return node;
  if (node === null || typeof node !== 'object' || Array.isArray(node)) return null;
  const obj = node as Record<string, unknown>;
  for (const cond of conditions) {
    if (obj[cond] !== undefined) {
      const found = walkConditions(obj[cond], conditions);
      if (found) return found;
    }
  }
  return null;
}

/**
 * Resolve a subpath through a package's `exports` field using the browser ESM
 * condition priority. `subpath` is the Node-style key: `.` for the root, or
 * `./foo` for a subentry. Handles two `exports` shapes:
 *   - subpath map: `{ ".": ..., "./web": ... }` (the common case)
 *   - bare conditions / string at root: `{ "import": "./x.js" }` or `"./x.js"`
 *     (only valid for subpath = `.`)
 */
function resolveSubpathInExports(
  exports: unknown,
  subpath: string,
  conditions: readonly string[],
): string | null {
  if (exports === null || exports === undefined) return null;
  if (typeof exports === 'string') {
    return subpath === '.' ? exports : null;
  }
  if (typeof exports !== 'object' || Array.isArray(exports)) return null;
  const obj = exports as Record<string, unknown>;
  const hasSubpathKeys = Object.keys(obj).some((k) => k.startsWith('.'));
  if (hasSubpathKeys) {
    const entry = obj[subpath];
    if (entry === undefined) return null;
    return walkConditions(entry, conditions);
  }
  // No subpath keys → exports IS the root conditions map.
  if (subpath !== '.') return null;
  return walkConditions(obj, conditions);
}

/**
 * Pick the browser ESM entry file for a given subpath from a parsed pkg.json.
 * Tries `exports` first, then legacy `module`/`main` for the root subpath only.
 * Returned path is the raw exports value (may start with `./`).
 */
function resolvePkgEntry(
  pkgJson: { exports?: unknown; module?: unknown; main?: unknown },
  subpath: string,
): string | null {
  if (pkgJson.exports !== undefined) {
    const result = resolveSubpathInExports(pkgJson.exports, subpath, BROWSER_ESM_CONDITIONS);
    if (result) return result;
  }
  if (subpath === '.') {
    if (typeof pkgJson.module === 'string') return pkgJson.module;
    if (typeof pkgJson.main === 'string') return pkgJson.main;
  }
  return null;
}

/**
 * Resolve one SHARED_DEPS entry to its on-disk location + import-map URL.
 *
 * Two-step resolution:
 *   1. Locate the package root by walking up from `fromDir` looking for
 *      `node_modules/<pkg>/package.json` ({@link findPkgRoot}). Manual FS
 *      lookup avoids the trap where workspace packages with ESM-only exports
 *      maps make `require.resolve` throw `No "exports" main defined`.
 *   2. Pick the actual entry file by walking the pkg's `exports` map with
 *      browser ESM conditions ({@link BROWSER_ESM_CONDITIONS}). This avoids
 *      landing on `./dist/server.cjs` for libraries that ship both bundles.
 */
export function resolveShared(entry: string, fromDir: string): IResolvedShared | null {
  const { pkg, subpath } = splitPkgAndSubpath(entry);
  const root = findPkgRoot(pkg, fromDir);
  if (!root) return null;
  let pkgJson: { exports?: unknown; module?: unknown; main?: unknown };
  try {
    pkgJson = JSON.parse(readFileSync(join(root.pkgRoot, 'package.json'), 'utf-8'));
  } catch {
    return null;
  }
  const exportsKey = subpath === '' ? '.' : `./${subpath}`;
  const rawEntry = resolvePkgEntry(pkgJson, exportsKey);
  if (!rawEntry) return null;
  // Normalise './dist/foo.js' → 'dist/foo.js' and Windows backslashes.
  const relPath = rawEntry.replace(/^\.\//, '').replace(/\\/g, '/');
  const resolvedFile = resolve(root.pkgRoot, relPath);
  // Defensive: drop entries that no longer exist on disk (shouldn't happen
  // if pkg ships what its exports promise, but cheap guard against typos).
  if (!existsSync(resolvedFile)) return null;
  return {
    entry,
    pkg,
    pkgRoot: root.pkgRoot,
    version: root.version,
    resolvedFile,
    relPath,
    url: `/_shared/${pkg}@${root.version}/${relPath}`,
  };
}

/**
 * Build the import-map object for a given app root.
 * Returns `{ imports: { [entry]: url } }`. Missing deps (resolve failure) are
 * skipped silently — Phase 1A is non-validating per architect Q3.
 */
export function buildImportMap(appRoot: string): { imports: Record<string, string> } {
  const imports: Record<string, string> = {};
  for (const entry of SHARED_DEPS) {
    const resolved = resolveShared(entry, appRoot);
    if (resolved) imports[entry] = resolved.url;
  }
  return { imports };
}

/**
 * Parse a `/_shared/...` URL into pkg + version + subpath.
 * Returns null on malformed input.
 *
 *   `/_shared/solid-js@1.9.12/dist/solid.js`
 *     → { pkg: 'solid-js', version: '1.9.12', subpath: 'dist/solid.js' }
 *   `/_shared/@capsuletech/web-core@0.5.0/dist/index.mjs`
 *     → { pkg: '@capsuletech/web-core', version: '0.5.0', subpath: 'dist/index.mjs' }
 */
export function parseSharedUrl(
  url: string,
): { pkg: string; version: string; subpath: string } | null {
  const PREFIX = '/_shared/';
  if (!url.startsWith(PREFIX)) return null;
  const rest = url.slice(PREFIX.length);
  if (!rest) return null;

  // Find the `<pkg>@<version>` segment (the @ that separates version from name).
  // For scoped pkgs we must skip the leading `@scope/` before locating the version `@`.
  let pkgEnd: number;
  if (rest.startsWith('@')) {
    const firstSlash = rest.indexOf('/');
    if (firstSlash < 0) return null;
    const atAfterName = rest.indexOf('@', firstSlash + 1);
    if (atAfterName < 0) return null;
    pkgEnd = atAfterName;
  } else {
    pkgEnd = rest.indexOf('@');
    if (pkgEnd < 0) return null;
  }
  const pkg = rest.slice(0, pkgEnd);
  const afterAt = rest.slice(pkgEnd + 1);
  const versionEnd = afterAt.indexOf('/');
  if (versionEnd < 0) return null;
  const version = afterAt.slice(0, versionEnd);
  const subpath = afterAt.slice(versionEnd + 1);
  if (!pkg || !version || !subpath) return null;
  return { pkg, version, subpath };
}

const CONTENT_TYPES: Record<string, string> = {
  '.js': 'text/javascript',
  '.mjs': 'text/javascript',
  '.cjs': 'text/javascript',
  '.json': 'application/json',
  '.map': 'application/json',
  '.css': 'text/css',
  '.wasm': 'application/wasm',
};

function contentTypeFor(file: string): string {
  return CONTENT_TYPES[extname(file).toLowerCase()] ?? 'application/octet-stream';
}

/** Recursively copy `src` directory into `dest`, skipping nested `node_modules`. */
function copyDirRecursive(src: string, dest: string): void {
  mkdirSync(dest, { recursive: true });
  for (const name of readdirSync(src)) {
    if (name === 'node_modules') continue;
    const s = join(src, name);
    const d = join(dest, name);
    const st = statSync(s);
    if (st.isDirectory()) {
      copyDirRecursive(s, d);
    } else if (st.isFile()) {
      copyFileSync(s, d);
    }
  }
}

export const ImportMapPlugin = (opts: IImportMapPluginOptions): Plugin => {
  let isBuild = false;
  let buildOutDir = '';

  return {
    name: 'capsule:import-map',
    enforce: 'pre',

    config(_config, env) {
      isBuild = env.command === 'build';
      // Tell Vite NOT to pre-bundle SHARED_DEPS into `/node_modules/.vite/deps/*`.
      // Vite's optimizeDeps rewrites `import 'solid-js'` to a resolved URL BEFORE
      // the browser applies the import-map (import-map only handles bare specifiers
      // that survive build-tool resolution). Excluding here keeps them bare in the
      // emitted dev module, so the browser routes them through our import-map to
      // `/_shared/<pkg>@<version>/<file>` instead of `.vite/deps/*?v=HASH`.
      // Merged with the larger exclude list in capsuleConfig.ts (Vite concatenates).
      return {
        optimizeDeps: {
          exclude: [...SHARED_DEPS],
        },
      };
    },

    configResolved(config) {
      buildOutDir = config.build?.outDir ?? '';
    },

    // Inject `<script type="importmap">` early in <head> so any subsequent
    // module script can rely on the mappings. injectTo: 'head-prepend' places
    // it before Vite's own injected scripts.
    transformIndexHtml: {
      order: 'pre',
      handler: () => {
        const map = buildImportMap(opts.appRoot);
        return [
          {
            tag: 'script',
            attrs: { type: 'importmap' },
            children: JSON.stringify(map, null, 2),
            injectTo: 'head-prepend',
          },
        ];
      },
    },

    configureServer(server) {
      // Serve /_shared/<pkg>@<version>/<file> from the app's node_modules.
      // Version mismatch with the installed pkg → 404 (no fallback).
      server.middlewares.use((req, res, next) => {
        if (!req.url || !req.url.startsWith('/_shared/')) return next();
        // Strip query string before parsing.
        const queryIdx = req.url.indexOf('?');
        const cleanUrl = queryIdx >= 0 ? req.url.slice(0, queryIdx) : req.url;
        const parsed = parseSharedUrl(cleanUrl);
        if (!parsed) {
          res.statusCode = 404;
          res.end('Bad /_shared/ URL');
          return;
        }
        const resolved = resolveShared(parsed.pkg, opts.appRoot);
        if (!resolved) {
          res.statusCode = 404;
          res.end(`Package not installed: ${parsed.pkg}`);
          return;
        }
        if (resolved.version !== parsed.version) {
          res.statusCode = 404;
          res.end(
            `Version mismatch for ${parsed.pkg}: requested ${parsed.version}, installed ${resolved.version}`,
          );
          return;
        }
        const filePath = join(resolved.pkgRoot, parsed.subpath);
        if (!existsSync(filePath) || !statSync(filePath).isFile()) {
          res.statusCode = 404;
          res.end(`File not found: ${parsed.subpath}`);
          return;
        }
        try {
          const body = readFileSync(filePath);
          res.writeHead(200, {
            'Content-Type': contentTypeFor(filePath),
            'Content-Length': body.length,
          });
          res.end(body);
        } catch (err) {
          res.statusCode = 500;
          res.end(`Read error: ${(err as Error).message}`);
        }
      });
    },

    // At build time, copy each shared pkg's full root directory (excluding
    // nested node_modules) into dist/_shared/<pkg>@<version>/. Whole-pkg copy
    // keeps internal relative imports intact (architect Q2: whole-pkg-dist).
    closeBundle() {
      if (!isBuild || !buildOutDir) return;
      // Deduplicate to base pkgs (solid-js, solid-js/web, solid-js/store → one solid-js).
      const seen = new Set<string>();
      for (const entry of SHARED_DEPS) {
        const { pkg } = splitPkgAndSubpath(entry);
        if (seen.has(pkg)) continue;
        seen.add(pkg);
        const resolved = resolveShared(pkg, opts.appRoot);
        if (!resolved) continue;
        const destDir = join(buildOutDir, '_shared', `${resolved.pkg}@${resolved.version}`);
        copyDirRecursive(resolved.pkgRoot, destDir);
      }
    },
  };
};
