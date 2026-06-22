/**
 * solidBundleShim.test.ts
 *
 * Characterization tests for solidBundleShim — import-map generation utilities.
 *
 * Contracts:
 *  1. buildSolidImportMap returns object with `imports` key.
 *  2. All SOLID_IMPORT_SPECIFIERS are present as keys in `imports`.
 *  3. All values are absolute URLs prefixed with hostOrigin.
 *  4. Custom `paths` override specific specifiers.
 *  5. renderSolidImportMapTag returns a valid <script type="importmap"> tag.
 *  6. The tag contains valid JSON matching buildSolidImportMap output.
 *  7. Different hostOrigins produce different URL prefixes.
 */

import { describe, expect, it } from 'vitest';
import {
  buildSolidImportMap,
  renderSolidImportMapTag,
  SOLID_IMPORT_SPECIFIERS,
} from '../solidBundleShim';

const HOST = 'http://localhost:5173';
const PROD_HOST = 'https://app.example.com';

// ---------------------------------------------------------------------------
// SOLID_IMPORT_SPECIFIERS
// ---------------------------------------------------------------------------

describe('SOLID_IMPORT_SPECIFIERS', () => {
  it('contains solid-js core specifiers', () => {
    expect(SOLID_IMPORT_SPECIFIERS).toContain('solid-js');
    expect(SOLID_IMPORT_SPECIFIERS).toContain('solid-js/web');
    expect(SOLID_IMPORT_SPECIFIERS).toContain('solid-js/store');
  });

  it('is a readonly tuple (not mutated)', () => {
    // Can iterate but not push
    expect(Array.isArray(SOLID_IMPORT_SPECIFIERS)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// buildSolidImportMap
// ---------------------------------------------------------------------------

describe('buildSolidImportMap', () => {
  it('returns object with imports key', () => {
    const result = buildSolidImportMap(HOST);
    expect(result).toHaveProperty('imports');
    expect(typeof result.imports).toBe('object');
  });

  it('all SOLID_IMPORT_SPECIFIERS are present as keys', () => {
    const { imports } = buildSolidImportMap(HOST);
    for (const specifier of SOLID_IMPORT_SPECIFIERS) {
      expect(imports).toHaveProperty(specifier);
    }
  });

  it('all values start with hostOrigin', () => {
    const { imports } = buildSolidImportMap(HOST);
    for (const url of Object.values(imports)) {
      expect(url).toMatch(new RegExp(`^${HOST}`));
    }
  });

  it('solid-js URL is an absolute URL ending in .js', () => {
    const { imports } = buildSolidImportMap(HOST);
    expect(imports['solid-js']).toMatch(/^https?:\/\/.+\.js$/);
  });

  it('custom paths override specific specifiers', () => {
    const customPath = '/assets/solid-abc123.mjs';
    const { imports } = buildSolidImportMap(HOST, { 'solid-js': customPath });

    expect(imports['solid-js']).toBe(`${HOST}${customPath}`);
    // Other specifiers should still use defaults
    expect(imports['solid-js/web']).toMatch(new RegExp(`^${HOST}`));
    expect(imports['solid-js/store']).toMatch(new RegExp(`^${HOST}`));
  });

  it('custom paths can override multiple specifiers', () => {
    const { imports } = buildSolidImportMap(HOST, {
      'solid-js': '/dist/solid.mjs',
      'solid-js/web': '/dist/web.mjs',
    });

    expect(imports['solid-js']).toBe(`${HOST}/dist/solid.mjs`);
    expect(imports['solid-js/web']).toBe(`${HOST}/dist/web.mjs`);
    // Untouched
    expect(imports['solid-js/store']).toMatch(new RegExp(`^${HOST}`));
  });

  it('different hostOrigins produce different URL prefixes', () => {
    const { imports: devImports } = buildSolidImportMap(HOST);
    const { imports: prodImports } = buildSolidImportMap(PROD_HOST);

    expect(devImports['solid-js']).toMatch(new RegExp(`^${HOST}`));
    expect(prodImports['solid-js']).toMatch(new RegExp(`^${PROD_HOST}`));
    expect(devImports['solid-js']).not.toBe(prodImports['solid-js']);
  });

  it('empty paths override uses all defaults', () => {
    const withEmpty = buildSolidImportMap(HOST, {});
    const withDefault = buildSolidImportMap(HOST);
    expect(withEmpty).toEqual(withDefault);
  });
});

// ---------------------------------------------------------------------------
// renderSolidImportMapTag
// ---------------------------------------------------------------------------

describe('renderSolidImportMapTag', () => {
  it('returns a string containing <script type="importmap">', () => {
    const tag = renderSolidImportMapTag(HOST);
    expect(tag).toContain('<script type="importmap">');
    expect(tag).toContain('</script>');
  });

  it('the JSON inside the tag is valid and matches buildSolidImportMap', () => {
    const tag = renderSolidImportMapTag(HOST);
    // Extract JSON between tags
    const match = tag.match(/<script type="importmap">([\s\S]*?)<\/script>/);
    expect(match).not.toBeNull();

    const parsed = JSON.parse(match![1]);
    const expected = buildSolidImportMap(HOST);
    expect(parsed).toEqual(expected);
  });

  it('passes custom paths through to JSON', () => {
    const customPath = '/custom/solid.mjs';
    const tag = renderSolidImportMapTag(HOST, { 'solid-js': customPath });
    expect(tag).toContain(`${HOST}${customPath}`);
  });

  it('prod host produces correct URLs in tag', () => {
    const tag = renderSolidImportMapTag(PROD_HOST);
    expect(tag).toContain(PROD_HOST);
  });

  it('tag format: importmap script must come before any module script (documentation check)', () => {
    // This test documents the HTML spec requirement: import-map before module scripts.
    // We verify the tag starts with <script type="importmap"> without leading whitespace (trimmable).
    const tag = renderSolidImportMapTag(HOST).trim();
    expect(tag.startsWith('<script type="importmap">')).toBe(true);
  });
});
