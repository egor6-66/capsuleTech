import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  buildImportMap,
  ImportMapPlugin,
  parseSharedUrl,
  resolveShared,
  SHARED_DEPS,
} from '../importMap';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../../../../..');
const APP_ROOT = resolve(REPO_ROOT, 'apps/playground');

describe('SHARED_DEPS', () => {
  it('contains core solid + capsule runtime singletons', () => {
    expect(SHARED_DEPS).toContain('solid-js');
    expect(SHARED_DEPS).toContain('solid-js/web');
    expect(SHARED_DEPS).toContain('solid-js/store');
    expect(SHARED_DEPS).toContain('@capsuletech/web-core');
    expect(SHARED_DEPS).toContain('@capsuletech/web-router');
    expect(SHARED_DEPS).toContain('@capsuletech/web-state');
    expect(SHARED_DEPS).toContain('@capsuletech/web-ui');
  });

  it('is a readonly tuple at the type level', () => {
    // The constant is `as const`. Runtime check: it's an array of strings.
    expect(Array.isArray(SHARED_DEPS)).toBe(true);
    for (const entry of SHARED_DEPS) expect(typeof entry).toBe('string');
  });
});

describe('parseSharedUrl', () => {
  it('parses unscoped pkg + version + subpath', () => {
    expect(parseSharedUrl('/_shared/solid-js@1.9.12/dist/solid.js')).toEqual({
      pkg: 'solid-js',
      version: '1.9.12',
      subpath: 'dist/solid.js',
    });
  });

  it('parses unscoped pkg with multi-segment subpath', () => {
    expect(parseSharedUrl('/_shared/solid-js@1.9.12/web/dist/web.js')).toEqual({
      pkg: 'solid-js',
      version: '1.9.12',
      subpath: 'web/dist/web.js',
    });
  });

  it('parses scoped pkg + version + subpath', () => {
    expect(parseSharedUrl('/_shared/@capsuletech/web-core@0.1.1/dist/index.mjs')).toEqual({
      pkg: '@capsuletech/web-core',
      version: '0.1.1',
      subpath: 'dist/index.mjs',
    });
  });

  it('parses scoped pkg with multi-segment subpath', () => {
    expect(parseSharedUrl('/_shared/@scope/name@1.0.0/sub/path/file.js')).toEqual({
      pkg: '@scope/name',
      version: '1.0.0',
      subpath: 'sub/path/file.js',
    });
  });

  it('parses pkg with prerelease version', () => {
    expect(parseSharedUrl('/_shared/solid-js@2.0.0-beta.1/dist/solid.js')).toEqual({
      pkg: 'solid-js',
      version: '2.0.0-beta.1',
      subpath: 'dist/solid.js',
    });
  });

  it('returns null for URL without /_shared/ prefix', () => {
    expect(parseSharedUrl('/foo/bar.js')).toBeNull();
    expect(parseSharedUrl('/shared/solid-js@1.0.0/x.js')).toBeNull();
  });

  it('returns null when version segment missing', () => {
    expect(parseSharedUrl('/_shared/solid-js/dist/solid.js')).toBeNull();
    expect(parseSharedUrl('/_shared/@scope/name/dist/x.js')).toBeNull();
  });

  it('returns null when subpath missing', () => {
    expect(parseSharedUrl('/_shared/solid-js@1.9.12/')).toBeNull();
    expect(parseSharedUrl('/_shared/solid-js@1.9.12')).toBeNull();
  });

  it('returns null for empty/short paths', () => {
    expect(parseSharedUrl('/_shared/')).toBeNull();
    expect(parseSharedUrl('')).toBeNull();
  });
});

describe('resolveShared (real workspace resolution)', () => {
  it('resolves solid-js to a real file with version and pkgRoot', () => {
    const resolved = resolveShared('solid-js', APP_ROOT);
    expect(resolved).not.toBeNull();
    if (!resolved) return;
    expect(resolved.pkg).toBe('solid-js');
    expect(resolved.version).toMatch(/^\d+\.\d+\.\d+/);
    expect(resolved.resolvedFile).toMatch(/solid-js/);
    expect(resolved.relPath).not.toContain('\\');
    expect(resolved.url).toBe(`/_shared/solid-js@${resolved.version}/${resolved.relPath}`);
  });

  it('resolves solid-js/web with subpath in relPath and parent pkg version', () => {
    const web = resolveShared('solid-js/web', APP_ROOT);
    const core = resolveShared('solid-js', APP_ROOT);
    expect(web).not.toBeNull();
    expect(core).not.toBeNull();
    if (!web || !core) return;
    expect(web.pkg).toBe('solid-js');
    expect(web.version).toBe(core.version);
    expect(web.relPath.startsWith('web/')).toBe(true);
  });

  it('returns null for an unknown package', () => {
    expect(resolveShared('this-pkg-definitely-does-not-exist-12345', APP_ROOT)).toBeNull();
  });

  // Regression: brief adr-057-phase1a-fix-resolveShared-conditions.md — without
  // browser ESM conditions, require.resolve('solid-js') lands on node.import =
  // ./dist/server.cjs, which fails in browser ESM parser.
  it('picks browser ESM bundle for solid-js (NOT the CJS server bundle)', () => {
    const resolved = resolveShared('solid-js', APP_ROOT);
    expect(resolved).not.toBeNull();
    if (!resolved) return;
    expect(resolved.relPath).toBe('dist/solid.js');
    expect(resolved.relPath).not.toContain('server.cjs');
    expect(resolved.relPath).not.toContain('.cjs');
  });

  it('picks browser ESM bundle for solid-js/web', () => {
    const resolved = resolveShared('solid-js/web', APP_ROOT);
    expect(resolved).not.toBeNull();
    if (!resolved) return;
    expect(resolved.relPath).toBe('web/dist/web.js');
  });

  it('picks browser ESM bundle for solid-js/store', () => {
    const resolved = resolveShared('solid-js/store', APP_ROOT);
    expect(resolved).not.toBeNull();
    if (!resolved) return;
    expect(resolved.relPath).toBe('store/dist/store.js');
  });

  it('resolved solid-js bundle is real ESM (no CJS module.exports)', () => {
    const resolved = resolveShared('solid-js', APP_ROOT);
    expect(resolved).not.toBeNull();
    if (!resolved) return;
    const content = readFileSync(resolved.resolvedFile, 'utf-8');
    // ESM bundle MUST NOT use CJS exports
    expect(content).not.toContain('module.exports');
    // ESM bundle should contain at least one `export` statement
    expect(content).toMatch(/\bexport\s+(?:default\s+|\{|const|function|class|let|var)/);
  });

  it('picks .mjs for @capsuletech workspace pkg via exports.import', () => {
    // Workspace packages live under apps/<app>/node_modules (pnpm), not at repo root.
    const resolved = resolveShared('@capsuletech/web-core', APP_ROOT);
    expect(resolved).not.toBeNull();
    if (!resolved) return;
    expect(resolved.relPath.endsWith('.mjs')).toBe(true);
  });
});

describe('buildImportMap', () => {
  it('returns an object with imports map keyed by SHARED_DEPS entries', () => {
    const map = buildImportMap(APP_ROOT);
    expect(map).toHaveProperty('imports');
    expect(typeof map.imports).toBe('object');
    // At minimum solid-js must resolve in a workspace where solid-js is installed.
    expect(map.imports['solid-js']).toBeDefined();
    expect(map.imports['solid-js']).toMatch(/^\/_shared\/solid-js@\d+\.\d+\.\d+/);
  });

  it('every emitted URL parses back to a valid pkg+version+subpath', () => {
    const map = buildImportMap(APP_ROOT);
    for (const [entry, url] of Object.entries(map.imports)) {
      const parsed = parseSharedUrl(url);
      expect(parsed, `url for ${entry} should parse`).not.toBeNull();
      if (!parsed) continue;
      expect(parsed.version).toMatch(/^\d/);
      expect(parsed.subpath.length).toBeGreaterThan(0);
    }
  });
});

describe('ImportMapPlugin shape', () => {
  it('has expected name + hook surface', () => {
    const plugin = ImportMapPlugin({ appRoot: APP_ROOT, workspaceRoot: REPO_ROOT });
    expect(plugin.name).toBe('capsule:import-map');
    expect(plugin.enforce).toBe('pre');
    expect(typeof plugin.configureServer).toBe('function');
    expect(typeof plugin.closeBundle).toBe('function');
    expect(plugin.transformIndexHtml).toBeDefined();
  });

  it('config hook returns optimizeDeps.exclude containing every SHARED_DEPS entry', () => {
    const plugin = ImportMapPlugin({ appRoot: APP_ROOT, workspaceRoot: REPO_ROOT });
    const config = plugin.config as (
      cfg: Record<string, unknown>,
      env: { command: 'build' | 'serve' },
    ) => { optimizeDeps?: { exclude?: string[] } } | void;
    const result = config({}, { command: 'serve' });
    expect(result).toBeDefined();
    expect(result?.optimizeDeps?.exclude).toBeDefined();
    for (const dep of SHARED_DEPS) {
      expect(result?.optimizeDeps?.exclude).toContain(dep);
    }
  });

  it('transformIndexHtml handler returns importmap script tag', () => {
    const plugin = ImportMapPlugin({ appRoot: APP_ROOT, workspaceRoot: REPO_ROOT });
    const t = plugin.transformIndexHtml as {
      handler: () => Array<{ tag: string; attrs: Record<string, string>; children: string; injectTo: string }>;
    };
    const tags = t.handler();
    expect(Array.isArray(tags)).toBe(true);
    expect(tags).toHaveLength(1);
    expect(tags[0].tag).toBe('script');
    expect(tags[0].attrs.type).toBe('importmap');
    expect(tags[0].injectTo).toBe('head-prepend');
    const body = JSON.parse(tags[0].children);
    expect(body).toHaveProperty('imports');
    expect(body.imports['solid-js']).toBeDefined();
  });
});
