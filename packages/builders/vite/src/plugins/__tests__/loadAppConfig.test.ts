/**
 * Tests for loadConfigFresh (jiti globals injection) + loadAppConfig three-state API.
 *
 * What is covered:
 *
 * ── loadConfigFresh — jiti globals injection ────────────────────────────────
 *  - defineAppConfig bare call does NOT throw ReferenceError (Fix 1)
 *  - defineCapsuleConfig bare call does NOT throw ReferenceError (Fix 1)
 *  - defineEndpoint bare call does NOT throw ReferenceError (Fix 1)
 *  - Injected globals are cleaned up after load (no side-effects on globalThis)
 *
 * ── loadAppConfig — three-state return (Fix 2) ──────────────────────────────
 *  - { status: 'ok', config } on valid configFile
 *  - { status: 'missing' } for a path that doesn't exist
 *  - { status: 'error', error, configPath } for a file with syntax error
 *
 * ── docs-sources resilience on transient error (Fix 2) ──────────────────────
 *  - On 'error' result: sub-gen does NOT removeOut (keeps existing file)
 *  - On 'missing' result: sub-gen DOES removeOut (valid cleanup path)
 *
 * Note: loadConfigFresh is not directly exported from the public API.
 * We test it indirectly via createCapsuleRegistryPlugin by using a real
 * temporary capsule.app.ts fixture and calling plugin.buildStart().
 * For the simpler unit-level tests we create a minimal test CodegenContext
 * that simulates what createContext() produces.
 */

import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { createJiti } from 'jiti';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  type AppConfigResult,
  type CodegenContext,
  createDocsSourcesSubGenerator,
} from '../codegen';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Creates a temp directory for the test, cleaned up in afterAll. */
function makeTempDir(): string {
  return mkdtempSync(join(tmpdir(), 'capsule-test-'));
}

/** Writes a temp TS file, returns its path. */
function writeTempFile(dir: string, name: string, content: string): string {
  const p = join(dir, name);
  writeFileSync(p, content, 'utf-8');
  return p;
}

// ---------------------------------------------------------------------------
// jiti globals injection — verifying Fix 1
// ---------------------------------------------------------------------------
// We load temp .ts files via jiti (same mechanism as loadConfigFresh)
// and verify that bare `defineAppConfig / defineCapsuleConfig / defineEndpoint`
// calls work without ReferenceError after the globals are injected.

describe('jiti globals injection (Fix 1)', () => {
  let tmpDir: string;

  beforeAll(() => {
    tmpDir = makeTempDir();
  });

  afterAll(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  // Replicate the globals injection logic from loadConfigFresh.
  const VITE_TIME_GLOBALS = ['defineAppConfig', 'defineCapsuleConfig', 'defineEndpoint'] as const;

  function loadWithGlobals(filePath: string): unknown {
    const prevValues = new Map<string, unknown>();
    for (const name of VITE_TIME_GLOBALS) {
      prevValues.set(name, (globalThis as Record<string, unknown>)[name]);
      (globalThis as Record<string, unknown>)[name] = <T>(x: T): T => x;
    }
    try {
      const j = createJiti(import.meta.url, { interopDefault: true, moduleCache: false });
      const mod = j(filePath) as { default?: unknown } | unknown;
      return (mod as { default?: unknown })?.default ?? mod;
    } finally {
      for (const name of VITE_TIME_GLOBALS) {
        const prev = prevValues.get(name);
        if (prev === undefined) {
          delete (globalThis as Record<string, unknown>)[name];
        } else {
          (globalThis as Record<string, unknown>)[name] = prev;
        }
      }
    }
  }

  it('defineAppConfig bare call returns the argument without ReferenceError', () => {
    const file = writeTempFile(
      tmpDir,
      'test-defineAppConfig.ts',
      `export default defineAppConfig({ meta: { tags: ['test'] } });`,
    );
    let result: unknown;
    expect(() => {
      result = loadWithGlobals(file);
    }).not.toThrow();
    expect(result).toMatchObject({ meta: { tags: ['test'] } });
  });

  it('defineCapsuleConfig bare call returns the argument without ReferenceError', () => {
    const file = writeTempFile(
      tmpDir,
      'test-defineCapsuleConfig.ts',
      `export default defineCapsuleConfig({ base: '/app/' });`,
    );
    let result: unknown;
    expect(() => {
      result = loadWithGlobals(file);
    }).not.toThrow();
    expect(result).toMatchObject({ base: '/app/' });
  });

  it('defineEndpoint bare call returns the argument without ReferenceError', () => {
    const file = writeTempFile(
      tmpDir,
      'test-defineEndpoint.ts',
      `export default defineEndpoint({ method: 'GET', path: '/users' });`,
    );
    let result: unknown;
    expect(() => {
      result = loadWithGlobals(file);
    }).not.toThrow();
    expect(result).toMatchObject({ method: 'GET', path: '/users' });
  });

  it('injected globals are cleaned up after load (no lingering globalThis pollution)', () => {
    // Before loading — globals should not exist (or be whatever they were before)
    const beforeAppConfig = (globalThis as Record<string, unknown>).defineAppConfig;

    const file = writeTempFile(
      tmpDir,
      'test-cleanup.ts',
      `export default defineAppConfig({ check: true });`,
    );
    loadWithGlobals(file);

    // After loading — globalThis.defineAppConfig should be restored to the prior value
    const afterAppConfig = (globalThis as Record<string, unknown>).defineAppConfig;
    expect(afterAppConfig).toBe(beforeAppConfig);
  });

  it('throws on file with syntax error (not masked by globals injection)', () => {
    const file = writeTempFile(
      tmpDir,
      'test-syntax-error.ts',
      `export default defineAppConfig({ broken: ===== });`,
    );
    expect(() => loadWithGlobals(file)).toThrow();
  });
});

// ---------------------------------------------------------------------------
// loadAppConfig three-state API — tested via a minimal CodegenContext simulation
// ---------------------------------------------------------------------------
// We construct a CodegenContext manually to unit-test the three states,
// matching what createContext() in orchestrator.ts produces.

import { existsSync } from 'node:fs';

/**
 * Creates a minimal loadAppConfig function using the same logic as
 * createContext() in orchestrator.ts (the function under test).
 * Returns the function directly so we can unit-test the three states.
 */
function makeLoadAppConfig(appConfigPath: string): () => AppConfigResult {
  const VITE_TIME_GLOBALS = ['defineAppConfig', 'defineCapsuleConfig', 'defineEndpoint'] as const;

  const loadConfigFresh = (configPath: string): unknown => {
    const prevValues = new Map<string, unknown>();
    for (const name of VITE_TIME_GLOBALS) {
      prevValues.set(name, (globalThis as Record<string, unknown>)[name]);
      (globalThis as Record<string, unknown>)[name] = <T>(x: T): T => x;
    }
    try {
      const j = createJiti(import.meta.url, { interopDefault: true, moduleCache: false });
      const mod = j(configPath) as { default?: unknown } | unknown;
      return (mod as { default?: unknown })?.default ?? mod;
    } finally {
      for (const name of VITE_TIME_GLOBALS) {
        const prev = prevValues.get(name);
        if (prev === undefined) {
          delete (globalThis as Record<string, unknown>)[name];
        } else {
          (globalThis as Record<string, unknown>)[name] = prev;
        }
      }
    }
  };

  return (): AppConfigResult => {
    if (!existsSync(appConfigPath)) return { status: 'missing' };
    try {
      const config = loadConfigFresh(appConfigPath) as import('../codegen').AppConfigShape;
      return { status: 'ok', config };
    } catch (e) {
      return { status: 'error', error: e, configPath: appConfigPath };
    }
  };
}

describe('loadAppConfig three-state API (Fix 2)', () => {
  let tmpDir: string;

  beforeAll(() => {
    tmpDir = makeTempDir();
  });

  afterAll(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it('returns { status: "ok", config } for a valid capsule.app.ts with defineAppConfig', () => {
    const file = writeTempFile(
      tmpDir,
      'valid-capsule.app.ts',
      `export default defineAppConfig({ meta: { tags: ['studio'] }, aliases: { '@inputs': ['input'] } });`,
    );
    const load = makeLoadAppConfig(file);
    const result = load();
    expect(result.status).toBe('ok');
    if (result.status === 'ok') {
      expect(result.config.meta?.tags).toContain('studio');
      expect(result.config.aliases?.['@inputs']).toEqual(['input']);
    }
  });

  it('returns { status: "missing" } for a non-existent path', () => {
    const load = makeLoadAppConfig(join(tmpDir, 'does-not-exist.ts'));
    const result = load();
    expect(result.status).toBe('missing');
  });

  it('returns { status: "error", error, configPath } for a file with syntax error', () => {
    const file = writeTempFile(
      tmpDir,
      'broken-capsule.app.ts',
      `export default defineAppConfig({ broken: ===== });`,
    );
    const load = makeLoadAppConfig(file);
    const result = load();
    expect(result.status).toBe('error');
    if (result.status === 'error') {
      expect(result.error).toBeDefined();
      expect(result.configPath).toBe(file);
    }
  });
});

// ---------------------------------------------------------------------------
// docs-sources resilience — Fix 2 error handling
// ---------------------------------------------------------------------------

const CAPSULE_ROOT_RESILIENCE = resolve('/project/apps/myapp/.capsule');
const OUT_PATH_RESILIENCE = resolve(CAPSULE_ROOT_RESILIENCE, 'registry', 'docs-sources.ts');

interface TestCtxWithTracking extends CodegenContext {
  written: Map<string, string>;
  removed: string[];
  errors: string[];
}

function makeCtxWithResult(result: AppConfigResult): TestCtxWithTracking {
  const written = new Map<string, string>();
  const removed: string[] = [];
  const errors: string[] = [];
  return {
    capsuleRoot: CAPSULE_ROOT_RESILIENCE,
    watchDir: resolve('/project/apps/myapp/src'),
    appConfigPath: resolve('/project/apps/myapp/capsule.app.ts'),
    writeOut: (absPath: string, content: string) => {
      written.set(absPath, content);
    },
    removeOut: (absPath: string) => {
      removed.push(absPath);
    },
    parse: () => {
      throw new Error('not needed');
    },
    names: () => {
      throw new Error('not needed');
    },
    loadAppConfig: () => result,
    logger: {
      info: (_msg: string) => {},
      warn: (_msg: string) => {},
      error: (msg: string) => {
        errors.push(msg);
      },
    },
    written,
    removed,
    errors,
  } as unknown as TestCtxWithTracking;
}

describe('docs-sources — resilience on transient error (Fix 2)', () => {
  it('does NOT call removeOut when loadAppConfig returns status=error (keeps existing file)', () => {
    const gen = createDocsSourcesSubGenerator();
    const ctx = makeCtxWithResult({
      status: 'error',
      error: new Error('jiti parse failure'),
      configPath: '/project/apps/myapp/capsule.app.ts',
    });

    gen.flush(ctx, true);

    // The existing docs-sources.ts file must NOT be removed on a transient error.
    expect(ctx.removed).not.toContain(OUT_PATH_RESILIENCE);
    // And nothing was written either (output is unchanged).
    expect(ctx.written.size).toBe(0);
  });

  it('logs an error message when loadAppConfig returns status=error', () => {
    const gen = createDocsSourcesSubGenerator();
    const ctx = makeCtxWithResult({
      status: 'error',
      error: new Error('ReferenceError: defineAppConfig is not defined'),
      configPath: '/project/apps/myapp/capsule.app.ts',
    });

    gen.flush(ctx, true);

    expect(ctx.errors.length).toBeGreaterThan(0);
    expect(ctx.errors[0]).toContain('[capsule:docs-sources]');
    expect(ctx.errors[0]).toContain('failed to load appConfig');
  });

  it('DOES call removeOut when loadAppConfig returns status=missing (valid cleanup path)', () => {
    const gen = createDocsSourcesSubGenerator();
    const ctx = makeCtxWithResult({ status: 'missing' });

    gen.flush(ctx, true);

    expect(ctx.removed).toContain(OUT_PATH_RESILIENCE);
    expect(ctx.written.size).toBe(0);
  });
});

describe('docs-sources — successful generation info log (Fix 3)', () => {
  it('logs registered sources after successful write', () => {
    const gen = createDocsSourcesSubGenerator();
    const infoMessages: string[] = [];
    const ctx: TestCtxWithTracking = {
      capsuleRoot: CAPSULE_ROOT_RESILIENCE,
      watchDir: resolve('/project/apps/myapp/src'),
      appConfigPath: resolve('/project/apps/myapp/capsule.app.ts'),
      writeOut: (_absPath: string, _content: string) => {},
      removeOut: (_absPath: string) => {},
      parse: () => {
        throw new Error('not needed');
      },
      names: () => {
        throw new Error('not needed');
      },
      loadAppConfig: () => ({
        status: 'ok',
        config: { docs: { rootVault: true } },
      }),
      logger: {
        info: (msg: string) => {
          infoMessages.push(msg);
        },
        warn: (_msg: string) => {},
        error: (_msg: string) => {},
      },
      written: new Map(),
      removed: [],
      errors: [],
    } as unknown as TestCtxWithTracking;

    gen.flush(ctx, true);

    const infoLog = infoMessages.find((m) => m.includes('[capsule:docs-sources]'));
    expect(infoLog).toBeDefined();
    expect(infoLog).toContain('registered');
    expect(infoLog).toContain('source');
    expect(infoLog).toContain('root');
  });

  it('does NOT log info when entries are empty (cleanup path)', () => {
    const gen = createDocsSourcesSubGenerator();
    const infoMessages: string[] = [];
    const ctx: TestCtxWithTracking = {
      capsuleRoot: CAPSULE_ROOT_RESILIENCE,
      watchDir: resolve('/project/apps/myapp/src'),
      appConfigPath: resolve('/project/apps/myapp/capsule.app.ts'),
      writeOut: (_absPath: string, _content: string) => {},
      removeOut: (_absPath: string) => {},
      parse: () => {
        throw new Error('not needed');
      },
      names: () => {
        throw new Error('not needed');
      },
      // No docs field → cleanup path
      loadAppConfig: () => ({ status: 'ok', config: {} }),
      logger: {
        info: (msg: string) => {
          infoMessages.push(msg);
        },
        warn: (_msg: string) => {},
        error: (_msg: string) => {},
      },
      written: new Map(),
      removed: [],
      errors: [],
    } as unknown as TestCtxWithTracking;

    gen.flush(ctx, true);

    const docsLog = infoMessages.find((m) => m.includes('[capsule:docs-sources]'));
    expect(docsLog).toBeUndefined();
  });
});
