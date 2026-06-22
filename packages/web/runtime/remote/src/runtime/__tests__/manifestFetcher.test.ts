/**
 * Tests for manifestFetcher — ADR 057 Phase 1B helpers.
 *
 * Covers:
 *  - fetchManifest happy path + HTTP-error + JSON-error + shape-validation
 *  - readHostImportMap with / without <script type="importmap"> + parse failure
 *  - parseSharedUrl unscoped / scoped / malformed
 *  - validateSharedCompat equal / mismatch / missing-in-host / non-shared-url-pass
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  fetchManifest,
  parseSharedUrl,
  readHostImportMap,
  validateSharedCompat,
} from '../manifestFetcher';

describe('fetchManifest', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns the parsed manifest on a 200 with valid JSON shape', async () => {
    const manifest = {
      name: 'hello',
      version: '0.0.1',
      entry: '/remote-entry.js',
    };
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve(manifest),
      }),
    );
    const got = await fetchManifest('http://x.test');
    expect(got).toEqual(manifest);
  });

  it('throws including URL on non-2xx', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        json: () => Promise.resolve({}),
      }),
    );
    await expect(fetchManifest('http://x.test')).rejects.toThrow(/404.*http:\/\/x\.test/);
  });

  it('throws on invalid JSON', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.reject(new Error('invalid json')),
      }),
    );
    await expect(fetchManifest('http://x.test')).rejects.toThrow(/not valid JSON/);
  });

  it('throws on missing required fields', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ name: 'x' }),
      }),
    );
    await expect(fetchManifest('http://x.test')).rejects.toThrow(/missing required fields/);
  });

  it('throws on network rejection with URL in message', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('ECONNREFUSED')));
    await expect(fetchManifest('http://x.test')).rejects.toThrow(/ECONNREFUSED.*http:\/\/x\.test/);
  });
});

describe('readHostImportMap', () => {
  let tag: HTMLScriptElement | null = null;

  afterEach(() => {
    if (tag) {
      tag.remove();
      tag = null;
    }
  });

  const setMap = (content: string) => {
    tag = document.createElement('script');
    tag.type = 'importmap';
    tag.textContent = content;
    document.head.appendChild(tag);
  };

  it('returns empty imports when no tag present', () => {
    expect(readHostImportMap()).toEqual({ imports: {} });
  });

  it('parses the tag content', () => {
    setMap(
      JSON.stringify({
        imports: {
          'solid-js': '/_shared/solid-js@1.9.12/dist/solid.js',
        },
      }),
    );
    const got = readHostImportMap();
    expect(got.imports['solid-js']).toBe('/_shared/solid-js@1.9.12/dist/solid.js');
  });

  it('returns empty imports on parse failure', () => {
    setMap('not-json{');
    expect(readHostImportMap()).toEqual({ imports: {} });
  });

  it('returns empty imports when tag has no imports field', () => {
    setMap('{"scopes":{}}');
    expect(readHostImportMap()).toEqual({ imports: {} });
  });
});

describe('parseSharedUrl', () => {
  it('parses unscoped pkg', () => {
    expect(parseSharedUrl('/_shared/solid-js@1.9.12/dist/solid.js')).toEqual({
      pkg: 'solid-js',
      version: '1.9.12',
    });
  });

  it('parses scoped pkg', () => {
    expect(parseSharedUrl('/_shared/@capsuletech/web-core@0.5.0/dist/index.mjs')).toEqual({
      pkg: '@capsuletech/web-core',
      version: '0.5.0',
    });
  });

  it('accepts absolute URL with origin', () => {
    expect(parseSharedUrl('http://localhost:3050/_shared/solid-js@1.9.12/dist/solid.js')).toEqual({
      pkg: 'solid-js',
      version: '1.9.12',
    });
  });

  it('returns null on non-/_shared/ URL', () => {
    expect(parseSharedUrl('/node_modules/solid-js/dist/solid.js')).toBeNull();
  });

  it('returns null on missing @version', () => {
    expect(parseSharedUrl('/_shared/solid-js/dist/solid.js')).toBeNull();
  });

  it('returns null on missing subpath', () => {
    expect(parseSharedUrl('/_shared/solid-js@1.0.0')).toBeNull();
  });
});

describe('validateSharedCompat', () => {
  it('passes when versions match', () => {
    expect(() =>
      validateSharedCompat(
        { 'solid-js': { version: '1.9.12', singleton: true } },
        { 'solid-js': '/_shared/solid-js@1.9.12/dist/solid.js' },
      ),
    ).not.toThrow();
  });

  it('throws on version mismatch including both versions', () => {
    expect(() =>
      validateSharedCompat(
        { 'solid-js': { version: '1.8.0', singleton: true } },
        { 'solid-js': '/_shared/solid-js@1.9.12/dist/solid.js' },
      ),
    ).toThrow(/solid-js.*1\.9\.12.*1\.8\.0/);
  });

  it('throws when host has not pinned the dep', () => {
    expect(() =>
      validateSharedCompat({ 'solid-js': { version: '1.9.12', singleton: true } }, {}),
    ).toThrow(/not pinned in host import-map/);
  });

  it('tolerates a non-/_shared/ host URL silently', () => {
    expect(() =>
      validateSharedCompat(
        { 'solid-js': { version: '1.9.12', singleton: true } },
        { 'solid-js': 'https://esm.sh/solid-js@1.9.12' },
      ),
    ).not.toThrow();
  });

  it('skips host-only pkgs not declared by remote', () => {
    expect(() =>
      validateSharedCompat(
        { 'solid-js': { version: '1.9.12', singleton: true } },
        {
          'solid-js': '/_shared/solid-js@1.9.12/dist/solid.js',
          '@capsuletech/web-core': '/_shared/@capsuletech/web-core@0.5.0/dist/index.mjs',
        },
      ),
    ).not.toThrow();
  });
});
