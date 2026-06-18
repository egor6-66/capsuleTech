/**
 * Tests for buildWorkspaceSrcAliases — alias resolution behaviour.
 *
 * Root cause captured here:
 *   Vite applies string `find` as a PREFIX match. A string alias
 *   `{ find: '@capsuletech/web-ui', replacement: '/path/to/index.ts' }`
 *   would match '@capsuletech/web-ui/docs.json', producing the nonsensical
 *   resolved path '/path/to/index.ts/docs.json' (os error 3 at build time).
 *
 *   Fix: `find` is now a RegExp with ^ and $ anchors → exact-match only.
 *   Subpaths without a tsconfig entry fall through to Vite's node_modules
 *   resolver and then to the package.json exports map (dist).
 *
 * What is covered:
 *
 * ── buildWorkspaceSrcAliases — exact-match aliases ──────────────────────────
 *  - Main entry (@capsuletech/web-ui)  → alias with RegExp find
 *  - RegExp is anchored (^ and $) → exact match only, no prefix capture
 *  - Main entry regex does NOT match subpath (/docs.json, /icons, /lib, /manifest)
 *  - Subpath entry (@capsuletech/web-ui/icons) → own alias entry, exact-match RegExp
 *  - Subpath entry regex matches its own specifier exactly
 *  - Subpath entry regex does NOT match deeper path
 *  - Wildcard entries are skipped (can't point to a single file)
 *  - Entries whose target does not exist on disk are skipped (self-discriminating)
 *  - Empty basePaths → empty alias array
 *
 * ── Vite alias simulation ────────────────────────────────────────────────────
 *  - Simulates Vite find matching logic to confirm subpaths resolve through
 *    exports map (no alias match) vs main entry resolves to src (alias match)
 */

import { resolve } from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock existsSync before importing the module under test so the mock is in
// place when the module initialises.
vi.mock('node:fs', () => ({
  existsSync: vi.fn(),
}));

import { existsSync } from 'node:fs';
import { buildWorkspaceSrcAliases, type ViteAliasEntry } from '../aliases';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const WORKSPACE_ROOT = resolve('/workspace');

/**
 * Simulates how Vite matches an alias entry against an import id.
 * Vite logic (simplified):
 *   - RegExp find: find.test(id)
 *   - string find: id === find || id.startsWith(find + '/')
 */
function viteMatches(entry: ViteAliasEntry, id: string): boolean {
  if (entry.find instanceof RegExp) {
    return entry.find.test(id);
  }
  return id === entry.find || id.startsWith(`${entry.find}/`);
}

/**
 * Finds the first alias entry that Vite would use for the given id, or null.
 */
function resolveAlias(aliases: ViteAliasEntry[], id: string): ViteAliasEntry | null {
  return aliases.find((a) => viteMatches(a, id)) ?? null;
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.mocked(existsSync).mockReset();
});

// ---------------------------------------------------------------------------
// Core: exact-match alias (RegExp)
// ---------------------------------------------------------------------------

describe('buildWorkspaceSrcAliases — main entry alias', () => {
  const BASE_PATHS: Record<string, string[]> = {
    '@capsuletech/web-ui': ['packages/web/kit/ui/src/index.ts'],
  };

  it('main entry produces a RegExp find (not a string)', () => {
    vi.mocked(existsSync).mockReturnValue(true);
    const aliases = buildWorkspaceSrcAliases(BASE_PATHS, WORKSPACE_ROOT);
    expect(aliases).toHaveLength(1);
    expect(aliases[0].find).toBeInstanceOf(RegExp);
  });

  it('main entry RegExp is anchored with ^ and $', () => {
    vi.mocked(existsSync).mockReturnValue(true);
    const aliases = buildWorkspaceSrcAliases(BASE_PATHS, WORKSPACE_ROOT);
    const pattern = aliases[0].find as RegExp;
    expect(pattern.source).toMatch(/^\^/);
    expect(pattern.source).toMatch(/\$$/);
  });

  it('main entry alias matches the exact specifier', () => {
    vi.mocked(existsSync).mockReturnValue(true);
    const aliases = buildWorkspaceSrcAliases(BASE_PATHS, WORKSPACE_ROOT);
    const matched = resolveAlias(aliases, '@capsuletech/web-ui');
    expect(matched).not.toBeNull();
    expect(matched!.replacement).toBe(resolve(WORKSPACE_ROOT, 'packages/web/kit/ui/src/index.ts'));
  });

  it('main entry alias does NOT match @capsuletech/web-ui/docs.json', () => {
    vi.mocked(existsSync).mockReturnValue(true);
    const aliases = buildWorkspaceSrcAliases(BASE_PATHS, WORKSPACE_ROOT);
    const matched = resolveAlias(aliases, '@capsuletech/web-ui/docs.json');
    // No alias should match → Vite falls through to node_modules exports map.
    expect(matched).toBeNull();
  });

  it('main entry alias does NOT match @capsuletech/web-ui/icons', () => {
    vi.mocked(existsSync).mockReturnValue(true);
    const aliases = buildWorkspaceSrcAliases(BASE_PATHS, WORKSPACE_ROOT);
    expect(resolveAlias(aliases, '@capsuletech/web-ui/icons')).toBeNull();
  });

  it('main entry alias does NOT match @capsuletech/web-ui/lib', () => {
    vi.mocked(existsSync).mockReturnValue(true);
    const aliases = buildWorkspaceSrcAliases(BASE_PATHS, WORKSPACE_ROOT);
    expect(resolveAlias(aliases, '@capsuletech/web-ui/lib')).toBeNull();
  });

  it('main entry alias does NOT match @capsuletech/web-ui/manifest', () => {
    vi.mocked(existsSync).mockReturnValue(true);
    const aliases = buildWorkspaceSrcAliases(BASE_PATHS, WORKSPACE_ROOT);
    expect(resolveAlias(aliases, '@capsuletech/web-ui/manifest')).toBeNull();
  });

  it('main entry alias does NOT match @capsuletech/web-ui/nonsense', () => {
    vi.mocked(existsSync).mockReturnValue(true);
    const aliases = buildWorkspaceSrcAliases(BASE_PATHS, WORKSPACE_ROOT);
    expect(resolveAlias(aliases, '@capsuletech/web-ui/nonsense')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Subpath entries that DO exist in tsconfig
// ---------------------------------------------------------------------------

describe('buildWorkspaceSrcAliases — subpath alias (tsconfig entry present)', () => {
  const BASE_PATHS: Record<string, string[]> = {
    '@capsuletech/web-ui': ['packages/web/kit/ui/src/index.ts'],
    '@capsuletech/web-ui/icons': ['packages/web/kit/ui/src/icons/index.ts'],
  };

  it('subpath entry produces its own alias entry', () => {
    vi.mocked(existsSync).mockReturnValue(true);
    const aliases = buildWorkspaceSrcAliases(BASE_PATHS, WORKSPACE_ROOT);
    expect(aliases).toHaveLength(2);
  });

  it('subpath alias uses RegExp (exact-match)', () => {
    vi.mocked(existsSync).mockReturnValue(true);
    const aliases = buildWorkspaceSrcAliases(BASE_PATHS, WORKSPACE_ROOT);
    const iconsAlias = aliases.find((a) => String(a.find).includes('web-ui\\/icons'));
    expect(iconsAlias).toBeDefined();
    expect(iconsAlias!.find).toBeInstanceOf(RegExp);
  });

  it('subpath alias matches its own specifier', () => {
    vi.mocked(existsSync).mockReturnValue(true);
    const aliases = buildWorkspaceSrcAliases(BASE_PATHS, WORKSPACE_ROOT);
    const matched = resolveAlias(aliases, '@capsuletech/web-ui/icons');
    expect(matched).not.toBeNull();
    expect(matched!.replacement).toBe(resolve(WORKSPACE_ROOT, 'packages/web/kit/ui/src/icons/index.ts'));
  });

  it('subpath alias does NOT match deeper path (icons/foo)', () => {
    vi.mocked(existsSync).mockReturnValue(true);
    const aliases = buildWorkspaceSrcAliases(BASE_PATHS, WORKSPACE_ROOT);
    const matched = resolveAlias(aliases, '@capsuletech/web-ui/icons/foo');
    // Should not match the icons alias (anchored $). Falls through.
    // (There may be no alias for it at all, or it falls to node_modules.)
    const iconsAlias = aliases.find((a) => String(a.find).includes('icons'));
    if (iconsAlias) {
      expect(viteMatches(iconsAlias, '@capsuletech/web-ui/icons/foo')).toBe(false);
    }
  });
});

// ---------------------------------------------------------------------------
// docs.json subpath — NOT in tsconfig → must have NO alias → fallthrough
// ---------------------------------------------------------------------------

describe('buildWorkspaceSrcAliases — docs.json subpath not in tsconfig', () => {
  it('no alias for /docs.json when absent from tsconfig → fallthrough to exports map', () => {
    vi.mocked(existsSync).mockReturnValue(true);
    const basePaths: Record<string, string[]> = {
      // docs.json NOT listed — simulates real state of tsconfig.base.json
      '@capsuletech/web-ui': ['packages/web/kit/ui/src/index.ts'],
      '@capsuletech/web-docs': ['packages/web/docs/src/index.ts'],
    };
    const aliases = buildWorkspaceSrcAliases(basePaths, WORKSPACE_ROOT);

    // @capsuletech/web-ui/docs.json must not be captured by ANY alias.
    expect(resolveAlias(aliases, '@capsuletech/web-ui/docs.json')).toBeNull();
    // @capsuletech/web-docs/docs.json same.
    expect(resolveAlias(aliases, '@capsuletech/web-docs/docs.json')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Self-discriminating: skip entries whose target file doesn't exist
// ---------------------------------------------------------------------------

describe('buildWorkspaceSrcAliases — self-discriminating (dist-only packages)', () => {
  it('skips alias when target src file does not exist on disk', () => {
    // Simulate capsule-test: packages installed from Verdaccio, no src/ dir.
    vi.mocked(existsSync).mockReturnValue(false);
    const basePaths: Record<string, string[]> = {
      '@capsuletech/web-ui': ['packages/web/kit/ui/src/index.ts'],
    };
    const aliases = buildWorkspaceSrcAliases(basePaths, WORKSPACE_ROOT);
    expect(aliases).toHaveLength(0);
  });

  it('includes alias only for packages that have src on disk', () => {
    const srcPath = resolve(WORKSPACE_ROOT, 'packages/web/kit/ui/src/index.ts');
    const distPath = resolve(WORKSPACE_ROOT, 'packages/web/other/src/index.ts');
    vi.mocked(existsSync).mockImplementation((p) => p === srcPath);

    const basePaths: Record<string, string[]> = {
      '@capsuletech/web-ui': ['packages/web/kit/ui/src/index.ts'],
      '@capsuletech/web-other': ['packages/web/other/src/index.ts'],
    };
    const aliases = buildWorkspaceSrcAliases(basePaths, WORKSPACE_ROOT);
    expect(aliases).toHaveLength(1);
    expect(String(aliases[0].find)).toContain('web-ui');
  });
});

// ---------------------------------------------------------------------------
// Wildcard entries skipped
// ---------------------------------------------------------------------------

describe('buildWorkspaceSrcAliases — wildcard entries skipped', () => {
  it('skips wildcard specifier @pkg/*', () => {
    vi.mocked(existsSync).mockReturnValue(true);
    const basePaths: Record<string, string[]> = {
      '@capsuletech/web-ui/*': ['packages/web/kit/ui/src/*'],
    };
    const aliases = buildWorkspaceSrcAliases(basePaths, WORKSPACE_ROOT);
    expect(aliases).toHaveLength(0);
  });

  it('skips entry with wildcard target', () => {
    vi.mocked(existsSync).mockReturnValue(true);
    const basePaths: Record<string, string[]> = {
      '@my/pkg': ['packages/my/src/*'],
    };
    const aliases = buildWorkspaceSrcAliases(basePaths, WORKSPACE_ROOT);
    expect(aliases).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Empty input
// ---------------------------------------------------------------------------

describe('buildWorkspaceSrcAliases — edge cases', () => {
  it('empty basePaths → empty alias array', () => {
    vi.mocked(existsSync).mockReturnValue(true);
    expect(buildWorkspaceSrcAliases({}, WORKSPACE_ROOT)).toHaveLength(0);
  });

  it('entry with empty targets array → skipped', () => {
    vi.mocked(existsSync).mockReturnValue(true);
    const basePaths: Record<string, string[]> = {
      '@capsuletech/web-ui': [],
    };
    expect(buildWorkspaceSrcAliases(basePaths, WORKSPACE_ROOT)).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Vite simulation: main entry resolves to src, subpaths fall through
// ---------------------------------------------------------------------------

describe('Vite alias simulation — main entry vs subpath resolution', () => {
  it('main entry resolves to src (HMR enabled)', () => {
    vi.mocked(existsSync).mockReturnValue(true);
    const basePaths: Record<string, string[]> = {
      '@capsuletech/web-ui': ['packages/web/kit/ui/src/index.ts'],
    };
    const aliases = buildWorkspaceSrcAliases(basePaths, WORKSPACE_ROOT);
    const entry = resolveAlias(aliases, '@capsuletech/web-ui');
    expect(entry).not.toBeNull();
    // Use path-separator-agnostic check (Windows uses backslashes).
    expect(entry!.replacement).toContain('index.ts');
    expect(entry!.replacement).toContain('src');
    expect(entry!.replacement).toContain('web');
  });

  it('dynamic import subpath (@capsuletech/web-ui/docs.json) has no alias → exports map', () => {
    vi.mocked(existsSync).mockReturnValue(true);
    const basePaths: Record<string, string[]> = {
      '@capsuletech/web-ui': ['packages/web/kit/ui/src/index.ts'],
      // icons IS in tsconfig → has its own alias
      '@capsuletech/web-ui/icons': ['packages/web/kit/ui/src/icons/index.ts'],
    };
    const aliases = buildWorkspaceSrcAliases(basePaths, WORKSPACE_ROOT);

    // docs.json is NOT in tsconfig → no alias → Vite uses exports map (dist/docs.json)
    expect(resolveAlias(aliases, '@capsuletech/web-ui/docs.json')).toBeNull();

    // icons IS in tsconfig → alias present → resolves to src
    expect(resolveAlias(aliases, '@capsuletech/web-ui/icons')).not.toBeNull();
  });
});
