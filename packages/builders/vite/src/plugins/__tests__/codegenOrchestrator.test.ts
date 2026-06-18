/**
 * Tests for the sub-generator orchestrator (ADR 037).
 *
 * Verifies:
 *  - createCapsuleRegistryPlugin produces a valid Vite plugin with correct name/enforce
 *  - config() hook merges sub-gen contributions (alias from barrel-registry)
 *  - transform() chain: endpoints transform + appConfig transform both work
 *  - SubGenerator contract: match/onEvent/flush sequence
 *  - Individual sub-generator factories work as standalone units
 *  - Plugin has no configResolved hook (alias registered via config(), not configResolved)
 *  - Extra generators are included and sorted by order
 */

import { join, resolve } from 'node:path';
import type { Plugin } from 'vite';
import { describe, expect, it, vi } from 'vitest';
import {
  createAppConfigSubGenerator,
  createBarrelRegistrySubGenerator,
  createBootstrapSubGenerator,
  createCapsuleRegistryPlugin,
  createDocsSourcesSubGenerator,
  createEndpointsSubGenerator,
  createPackagesSubGenerator,
  type CodegenContext,
  type SubGenerator,
} from '../codegen';

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

const WATCH_DIR = resolve('/project/apps/myapp/src');
const CAPSULE_ROOT = resolve('/project/apps/myapp/.capsule');
const APP_CONFIG_PATH = resolve('/project/apps/myapp/capsule.app.ts');
const ENDPOINTS_DIR_ABS = resolve(WATCH_DIR, 'endpoints');

function makeOrchestratorPlugin(extras?: SubGenerator[]) {
  return createCapsuleRegistryPlugin({
    capsuleRoot: CAPSULE_ROOT,
    watchDir: WATCH_DIR,
    appConfigPath: APP_CONFIG_PATH,
    extraGenerators: extras,
  }) as Plugin & {
    transform: (code: string, id: string) => { code: string; map: null } | null;
    config: () => { resolve?: { alias?: Record<string, string> } };
  };
}

// ---------------------------------------------------------------------------
// createCapsuleRegistryPlugin — plugin shape
// ---------------------------------------------------------------------------

describe('createCapsuleRegistryPlugin — plugin shape', () => {
  it('returns a plugin named capsule-registry', () => {
    const plugin = makeOrchestratorPlugin();
    expect(plugin.name).toBe('capsule-registry');
  });

  it('has enforce: pre', () => {
    const plugin = makeOrchestratorPlugin();
    expect(plugin.enforce).toBe('pre');
  });

  it('has config hook', () => {
    const plugin = makeOrchestratorPlugin();
    expect(typeof plugin.config).toBe('function');
  });

  it('has transform hook', () => {
    const plugin = makeOrchestratorPlugin();
    expect(typeof plugin.transform).toBe('function');
  });

  it('does NOT have configResolved hook (alias registered via config())', () => {
    const plugin = makeOrchestratorPlugin();
    expect(plugin).not.toHaveProperty('configResolved');
  });
});

// ---------------------------------------------------------------------------
// createCapsuleRegistryPlugin — config() alias contribution
// ---------------------------------------------------------------------------

describe('createCapsuleRegistryPlugin — config() alias', () => {
  it('includes @capsule/registry alias pointing to registry/index.ts', () => {
    const plugin = makeOrchestratorPlugin();
    const result = plugin.config();
    expect(result?.resolve?.alias?.['@capsule/registry']).toBe(
      resolve(CAPSULE_ROOT, 'registry', 'index.ts'),
    );
  });

  it('alias path contains .capsule/registry/index.ts', () => {
    const plugin = makeOrchestratorPlugin();
    const result = plugin.config();
    const aliasPath = result?.resolve?.alias?.['@capsule/registry'] ?? '';
    expect(aliasPath.replace(/\\/g, '/')).toContain('.capsule/registry/index.ts');
  });
});

// ---------------------------------------------------------------------------
// createCapsuleRegistryPlugin — transform chain
// ---------------------------------------------------------------------------

describe('createCapsuleRegistryPlugin — transform (defineEndpoint injection)', () => {
  it('injects defineEndpoint into endpoint files', () => {
    const plugin = makeOrchestratorPlugin();
    const id = join(ENDPOINTS_DIR_ABS, 'auth.ts');
    const code = `export const login = defineEndpoint((z) => ({ method: 'POST', path: '/login' }));`;
    const result = plugin.transform(code, id);
    expect(result).not.toBeNull();
    expect(result!.code).toContain("import { defineEndpoint } from '@capsuletech/web-query'");
  });

  it('does NOT inject if already imported (idempotent)', () => {
    const plugin = makeOrchestratorPlugin();
    const id = join(ENDPOINTS_DIR_ABS, 'auth.ts');
    const code = [
      "import { defineEndpoint } from '@capsuletech/web-query';",
      `export const login = defineEndpoint((z) => ({ method: 'POST', path: '/login' }));`,
    ].join('\n');
    const result = plugin.transform(code, id);
    expect(result).toBeNull();
  });

  it('does NOT inject into files outside endpoints/', () => {
    const plugin = makeOrchestratorPlugin();
    const id = resolve(WATCH_DIR, 'features', 'auth.ts');
    const result = plugin.transform('export const x = 1;', id);
    expect(result).toBeNull();
  });
});

describe('createCapsuleRegistryPlugin — transform (defineAppConfig unwrap)', () => {
  const SOURCE = `export default defineAppConfig({ meta: { tags: ['a'] } });\n`;

  it('unwraps defineAppConfig in capsule.app.ts', () => {
    const plugin = makeOrchestratorPlugin();
    const result = plugin.transform(SOURCE, APP_CONFIG_PATH);
    expect(result).not.toBeNull();
    expect(result!.code).toContain('((__x__)=>__x__)');
    expect(result!.code).not.toContain('defineAppConfig(');
  });

  it('does NOT transform unrelated files', () => {
    const plugin = makeOrchestratorPlugin();
    const result = plugin.transform(SOURCE, resolve(WATCH_DIR, 'main.tsx'));
    expect(result).toBeNull();
  });

  it('returns null if no defineAppConfig present', () => {
    const plugin = makeOrchestratorPlugin();
    const result = plugin.transform(`export default { foo: 1 };`, APP_CONFIG_PATH);
    expect(result).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Extra generators are included and sorted by order
// ---------------------------------------------------------------------------

describe('createCapsuleRegistryPlugin — extra generators', () => {
  it('extra generator transform is called in chain', () => {
    const transformFn = vi.fn((_code: string, _id: string, _ctx: CodegenContext) => null);
    const extraGen: SubGenerator = {
      id: 'test-extra',
      order: 50,
      match: () => false,
      onEvent: () => false,
      flush: () => {},
      transform: transformFn,
    };

    const plugin = makeOrchestratorPlugin([extraGen]);
    plugin.transform('const x = 1;', resolve(WATCH_DIR, 'widgets', 'test.tsx'));
    // transformFn is called because the orchestrator chains all sub-gen transforms.
    expect(transformFn).toHaveBeenCalled();
  });

  it('extra generator config is merged into config() result', () => {
    const extraGen: SubGenerator = {
      id: 'test-extra-config',
      order: 50,
      match: () => false,
      onEvent: () => false,
      flush: () => {},
      config: (_ctx) => ({
        resolve: { alias: { '@my/extra': '/path/to/extra' } },
      }),
    };

    const plugin = makeOrchestratorPlugin([extraGen]) as Plugin & {
      config: () => { resolve?: { alias?: Record<string, string> } };
    };
    const result = plugin.config();
    expect(result?.resolve?.alias?.['@my/extra']).toBe('/path/to/extra');
    // Original alias still present.
    expect(result?.resolve?.alias?.['@capsule/registry']).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// Individual sub-generator factories — standalone smoke
// ---------------------------------------------------------------------------

describe('createBarrelRegistrySubGenerator', () => {
  it('creates a sub-generator with id barrel-registry and order 10', () => {
    const gen = createBarrelRegistrySubGenerator();
    expect(gen.id).toBe('barrel-registry');
    expect(gen.order).toBe(10);
  });

  it('match() returns true for any file (filtering done in onEvent)', () => {
    const gen = createBarrelRegistrySubGenerator();
    expect(gen.match('/any/file.ts')).toBe(true);
  });

  it('bootstrap() returns null (ADR-034: barrel does not need side-effect import)', () => {
    const gen = createBarrelRegistrySubGenerator();
    const fakeCtx = {} as CodegenContext;
    expect(gen.bootstrap?.(fakeCtx)).toBeNull();
  });

  it('config() returns @capsule/registry alias for given capsuleRoot', () => {
    const gen = createBarrelRegistrySubGenerator();
    const fakeCtx = { capsuleRoot: CAPSULE_ROOT } as CodegenContext;
    const result = gen.config?.(fakeCtx);
    expect((result?.resolve?.alias as Record<string, string>)?.['@capsule/registry']).toBe(
      resolve(CAPSULE_ROOT, 'registry', 'index.ts'),
    );
  });

  it('onEvent returns false for files outside layer dirs', () => {
    const gen = createBarrelRegistrySubGenerator();
    const fakeCtx = { watchDir: WATCH_DIR } as CodegenContext;
    const result = gen.onEvent('add', resolve(WATCH_DIR, 'endpoints', 'auth.ts'), fakeCtx);
    expect(result).toBe(false);
  });

  it('onEvent returns true for a widget file', () => {
    const gen = createBarrelRegistrySubGenerator();
    const fakeCtx = { watchDir: WATCH_DIR } as CodegenContext;
    const result = gen.onEvent(
      'add',
      resolve(WATCH_DIR, 'widgets', 'forms', 'auth.tsx'),
      fakeCtx,
    );
    expect(result).toBe(true);
  });
});

describe('createEndpointsSubGenerator', () => {
  it('creates a sub-generator with id endpoints and order 20', () => {
    const gen = createEndpointsSubGenerator();
    expect(gen.id).toBe('endpoints');
    expect(gen.order).toBe(20);
  });

  it('match() returns true for any file (filtering in onEvent)', () => {
    const gen = createEndpointsSubGenerator();
    expect(gen.match('/any/file.ts')).toBe(true);
  });

  it('onEvent returns true for endpoint files', () => {
    const gen = createEndpointsSubGenerator();
    const fakeCtx = { watchDir: WATCH_DIR } as CodegenContext;
    const result = gen.onEvent(
      'add',
      resolve(WATCH_DIR, 'endpoints', 'auth.ts'),
      fakeCtx,
    );
    expect(result).toBe(true);
  });

  it('onEvent returns false for non-endpoint files', () => {
    const gen = createEndpointsSubGenerator();
    const fakeCtx = { watchDir: WATCH_DIR } as CodegenContext;
    const result = gen.onEvent(
      'add',
      resolve(WATCH_DIR, 'widgets', 'auth.tsx'),
      fakeCtx,
    );
    expect(result).toBe(false);
  });

  it('bootstrap() returns null (endpoints imported by app-config.gen, not directly)', () => {
    const gen = createEndpointsSubGenerator();
    const fakeCtx = {} as CodegenContext;
    expect(gen.bootstrap?.(fakeCtx)).toBeNull();
  });
});

describe('createAppConfigSubGenerator', () => {
  it('creates a sub-generator with id app-config and order 30', () => {
    const gen = createAppConfigSubGenerator();
    expect(gen.id).toBe('app-config');
    expect(gen.order).toBe(30);
  });

  it('match() returns false — not triggered by src file events', () => {
    const gen = createAppConfigSubGenerator();
    expect(gen.match('/any/file.ts')).toBe(false);
  });

  it('onAppConfigChange marks dirty and returns true', () => {
    const gen = createAppConfigSubGenerator();
    const fakeCtx = {} as CodegenContext;
    const result = gen.onAppConfigChange?.(fakeCtx);
    expect(result).toBe(true);
  });

  it('bootstrap() contributes subsystems phase', () => {
    const gen = createAppConfigSubGenerator();
    const fakeCtx = {} as CodegenContext;
    const contrib = gen.bootstrap?.(fakeCtx);
    expect(contrib?.phase).toBe('subsystems');
    expect(contrib?.importPath).toBe('./app-config.gen');
  });
});

describe('createPackagesSubGenerator', () => {
  it('creates a sub-generator with id packages and order 40', () => {
    const gen = createPackagesSubGenerator();
    expect(gen.id).toBe('packages');
    expect(gen.order).toBe(40);
  });

  it('match() returns false — not triggered by src file events', () => {
    const gen = createPackagesSubGenerator();
    expect(gen.match('/any/file.ts')).toBe(false);
  });

  it('onAppConfigChange marks dirty and returns true', () => {
    const gen = createPackagesSubGenerator();
    const fakeCtx = {} as CodegenContext;
    const result = gen.onAppConfigChange?.(fakeCtx);
    expect(result).toBe(true);
  });

  it('bootstrap() contributes globals phase', () => {
    const gen = createPackagesSubGenerator();
    const fakeCtx = {} as CodegenContext;
    const contrib = gen.bootstrap?.(fakeCtx);
    expect(contrib?.phase).toBe('globals');
    expect(contrib?.importPath).toBe('./registry/packages');
  });
});

describe('createDocsSourcesSubGenerator', () => {
  it('creates a sub-generator with id docs-sources and order 50', () => {
    const gen = createDocsSourcesSubGenerator();
    expect(gen.id).toBe('docs-sources');
    expect(gen.order).toBe(50);
  });

  it('match() returns false — not triggered by src file events', () => {
    const gen = createDocsSourcesSubGenerator();
    expect(gen.match('/any/file.ts')).toBe(false);
  });

  it('onAppConfigChange marks dirty and returns true', () => {
    const gen = createDocsSourcesSubGenerator();
    const fakeCtx = {} as CodegenContext;
    const result = gen.onAppConfigChange?.(fakeCtx);
    expect(result).toBe(true);
  });

  it('bootstrap() returns null before flush (_hasFile=false initially)', () => {
    // docs-sources bootstrap() is conditional — only returns contribution when
    // the file has actually been written (to avoid importing a non-existent module).
    const gen = createDocsSourcesSubGenerator();
    const fakeCtx = {} as CodegenContext;
    expect(gen.bootstrap?.(fakeCtx)).toBeNull();
  });
});

describe('createBootstrapSubGenerator', () => {
  it('creates a sub-generator with id bootstrap and order 90', () => {
    const gen = createBootstrapSubGenerator(() => []);
    expect(gen.id).toBe('bootstrap');
    expect(gen.order).toBe(90);
  });

  it('match() returns false — not triggered by src file events', () => {
    const gen = createBootstrapSubGenerator(() => []);
    expect(gen.match('/any/file.ts')).toBe(false);
  });

  it('bootstrap() returns null (does not contribute to its own output)', () => {
    const gen = createBootstrapSubGenerator(() => []);
    const fakeCtx = {} as CodegenContext;
    expect(gen.bootstrap?.(fakeCtx)).toBeNull();
  });

  it('onAppConfigChange() marks dirty and returns true', () => {
    // Bootstrap must re-generate when appConfig changes because sub-gen contributions
    // (e.g. docs-sources) may change based on the new appConfig content.
    const gen = createBootstrapSubGenerator(() => []);
    const fakeCtx = {} as CodegenContext;
    expect(gen.onAppConfigChange?.(fakeCtx)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Sub-generator ordering invariant
// ---------------------------------------------------------------------------

describe('sub-generator ordering', () => {
  it('built-in generators have deterministic order: barrel(10) < endpoints(20) < appConfig(30) < packages(40) < docs-sources(50) < bootstrap(90)', () => {
    const barrel = createBarrelRegistrySubGenerator();
    const endpoints = createEndpointsSubGenerator();
    const appConfig = createAppConfigSubGenerator();
    const packages = createPackagesSubGenerator();
    const docsSources = createDocsSourcesSubGenerator();
    const bootstrap = createBootstrapSubGenerator(() => []);

    expect(barrel.order).toBeLessThan(endpoints.order);
    expect(endpoints.order).toBeLessThan(appConfig.order);
    expect(appConfig.order).toBeLessThan(packages.order);
    expect(packages.order).toBeLessThan(docsSources.order);
    expect(docsSources.order).toBeLessThan(bootstrap.order);
  });

  it('bootstrap has the highest order (last to flush)', () => {
    const bootstrap = createBootstrapSubGenerator(() => []);
    expect(bootstrap.order).toBe(90);
  });

  it('docs-sources order is 50', () => {
    const docsSources = createDocsSourcesSubGenerator();
    expect(docsSources.order).toBe(50);
  });
});

// ---------------------------------------------------------------------------
// Bootstrap flush — collects contributions from sub-generators
// ---------------------------------------------------------------------------

/**
 * Minimal CodegenContext for bootstrap flush tests.
 * Tracks what was written to bootstrap.tsx.
 */
function makeBootstrapCtx(docsConfig?: { rootVault?: boolean }): {
  capsuleRoot: string;
  written: Map<string, string>;
  ctx: CodegenContext;
} {
  const capsuleRoot = resolve('/project/apps/myapp/.capsule');
  const written = new Map<string, string>();
  const appConfigPath = resolve('/project/apps/myapp/capsule.app.ts');
  const ctx: CodegenContext = {
    capsuleRoot,
    watchDir: resolve('/project/apps/myapp/src'),
    appConfigPath,
    writeOut: (absPath: string, content: string) => { written.set(absPath, content); },
    removeOut: (_absPath: string) => {},
    parse: () => { throw new Error('not needed'); },
    names: () => { throw new Error('not needed'); },
    // New three-state AppConfigResult API:
    // - docsConfig !== undefined → status 'ok' with the given docs config
    // - docsConfig === undefined → status 'ok' with empty config (no docs field)
    loadAppConfig: () =>
      docsConfig !== undefined
        ? { status: 'ok', config: { docs: docsConfig } }
        : { status: 'ok', config: {} },
  };
  return { capsuleRoot, written, ctx };
}

describe('bootstrap flush — contribution collection', () => {
  it('bootstrap.tsx does NOT contain docs-sources import when docs config is absent', () => {
    // Simulates the full cycle:
    //   1. docs-sources sub-gen flushes with no docs config → _hasFile=false
    //   2. bootstrap collects contributions → docs-sources returns null → not included
    const docsSources = createDocsSourcesSubGenerator();
    const allGenerators = [docsSources];

    const bootstrap = createBootstrapSubGenerator(() => allGenerators);

    const { ctx, written } = makeBootstrapCtx(undefined);

    // docs-sources flush: no docs → removeOut, _hasFile stays false
    docsSources.flush(ctx, true);

    // bootstrap flush: forced
    bootstrap.flush(ctx, true);

    const bootstrapContent = written.get(resolve(ctx.capsuleRoot, 'bootstrap.tsx'));
    expect(bootstrapContent).toBeDefined();
    expect(bootstrapContent).not.toContain('docs-sources');
  });

  it('bootstrap.tsx contains docs-sources import when docs config is present', () => {
    // Simulates the full cycle:
    //   1. docs-sources sub-gen flushes with rootVault=true → _hasFile=true
    //   2. bootstrap collects contributions → docs-sources returns { phase:'globals', importPath:'./registry/docs-sources' }
    const docsSources = createDocsSourcesSubGenerator();
    const allGenerators = [docsSources];

    const bootstrap = createBootstrapSubGenerator(() => allGenerators);

    const { ctx, written } = makeBootstrapCtx({ rootVault: true });

    // docs-sources flush: rootVault=true → writes file, _hasFile=true
    docsSources.flush(ctx, true);

    // bootstrap flush: forced
    bootstrap.flush(ctx, true);

    const bootstrapContent = written.get(resolve(ctx.capsuleRoot, 'bootstrap.tsx'));
    expect(bootstrapContent).toBeDefined();
    expect(bootstrapContent).toContain("import './registry/docs-sources';");
  });

  it('bootstrap.tsx removes docs-sources import after docs config is removed (onAppConfigChange cycle)', () => {
    // Simulates:
    //   Round 1: docs config present → docs-sources written → bootstrap has import
    //   Round 2: docs config removed → docs-sources removed → bootstrap drops import

    const docsSources = createDocsSourcesSubGenerator();
    const allGenerators = [docsSources];
    const bootstrap = createBootstrapSubGenerator(() => allGenerators);

    // --- Round 1: docs config present ---
    const { ctx: ctx1, written: written1 } = makeBootstrapCtx({ rootVault: true });
    docsSources.flush(ctx1, true);
    bootstrap.flush(ctx1, true);

    const content1 = written1.get(resolve(ctx1.capsuleRoot, 'bootstrap.tsx'));
    expect(content1).toContain("import './registry/docs-sources';");

    // --- Round 2: app config changed, docs removed ---
    docsSources.onAppConfigChange?.(ctx1); // marks dirty
    bootstrap.onAppConfigChange?.(ctx1);   // marks dirty

    // New context with no docs config
    const { ctx: ctx2, written: written2 } = makeBootstrapCtx(undefined);
    // Flush in order (orchestrator guarantees order 50 before 90)
    docsSources.flush(ctx2, false); // dirty → removeOut, _hasFile=false
    bootstrap.flush(ctx2, false);   // dirty → collects contributions → no docs-sources

    const content2 = written2.get(resolve(ctx2.capsuleRoot, 'bootstrap.tsx'));
    expect(content2).toBeDefined();
    expect(content2).not.toContain('docs-sources');
  });

  it('LAYER_INIT_ORDER entries are always present in bootstrap.tsx', () => {
    // Even with sub-gen contributions, legacy LAYER_INIT_ORDER entries must be present.
    const docsSources = createDocsSourcesSubGenerator();
    const bootstrap = createBootstrapSubGenerator(() => [docsSources]);

    const { ctx, written } = makeBootstrapCtx({ rootVault: true });
    docsSources.flush(ctx, true);
    bootstrap.flush(ctx, true);

    const content = written.get(resolve(ctx.capsuleRoot, 'bootstrap.tsx'));
    expect(content).toBeDefined();
    // Legacy entries from LAYER_INIT_ORDER — bare side-effect imports
    expect(content).toContain("import './registry/packages';");
    expect(content).toContain("import './app-config.gen';");
    expect(content).toContain("import { routeTree } from './routes/routeTree.gen'");
    // Contribution from docs-sources — bare side-effect import
    expect(content).toContain("import './registry/docs-sources';");
  });
});
