/**
 * Base codegen orchestrator.
 *
 * Single Vite plugin that owns ALL codegen in .capsule/.
 * Internally — a registry of SubGenerators, each self-contained.
 *
 * Adding new codegen = add one SubGenerator + register it here.
 * This file never needs to change when new generators are added.
 *
 * Responsibilities of the orchestrator:
 *   - Create CodegenContext (shared across all sub-gens)
 *   - Single watcher subscription on src/** (via watcherManager)
 *   - Dispatch events to matching sub-generators
 *   - Flush dirty sub-generators in order
 *   - Delegate Vite hooks (transform, config) to sub-gens
 *   - Watch capsule.app.ts and notify sub-gens on change
 *
 * ADR 037: refactor CapsuleRegistryPlugin into base orchestrator + sub-gens.
 */

import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { parse } from '@babel/parser';
import { names } from '@nx/devkit';
import { createJiti } from 'jiti';
import type { Plugin, UserConfig, ViteDevServer } from 'vite';
import { walkFiles, watcherManager } from '../../utils';
import { LAYER_INIT_ORDER } from '../capsuleRegistry';
import { createAppConfigSubGenerator } from './generators/appConfig';
import { createBarrelRegistrySubGenerator } from './generators/barrelRegistry';
import { createBootstrapSubGenerator } from './generators/bootstrap';
import { createDocsSourcesSubGenerator } from './generators/docs-sources';
import { createEndpointsSubGenerator } from './generators/endpoints';
import { createPackagesSubGenerator } from './generators/packages';
import type { AppConfigResult, AppConfigShape, CodegenContext, SubGenerator } from './interfaces';

// ---------------------------------------------------------------------------
// CodegenContext factory
// ---------------------------------------------------------------------------

/**
 * Vite-time global identifiers that capsule.app.ts / capsule.config.ts may use
 * as bare calls (auto-imported via Vite plugin at build time, but NOT available
 * in raw Node.js / jiti execution context).
 *
 * We inject identity functions before loading so that:
 *   defineAppConfig({ ... }) → returns the argument unchanged
 *   defineCapsuleConfig({ ... }) → same
 *   defineEndpoint({ ... }) → same
 *
 * This matches what the Vite transform hooks do at build time.
 */
const VITE_TIME_GLOBALS: ReadonlyArray<string> = [
  'defineAppConfig',
  'defineCapsuleConfig',
  'defineEndpoint',
];

const loadConfigFresh = (configPath: string): unknown => {
  // Inject identity stubs for Vite-time globals so that bare calls like
  // `defineAppConfig({...})` don't throw ReferenceError under jiti.
  const prevValues: Map<string, unknown> = new Map();
  for (const name of VITE_TIME_GLOBALS) {
    prevValues.set(name, (globalThis as Record<string, unknown>)[name]);
    (globalThis as Record<string, unknown>)[name] = <T>(x: T): T => x;
  }

  try {
    const j = createJiti(import.meta.url, { interopDefault: true, moduleCache: false });
    const mod = j(configPath) as { default?: unknown } | unknown;
    return (mod as { default?: unknown })?.default ?? mod;
  } finally {
    // Restore previous values (or remove injected keys) to avoid side-effects.
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

const createContext = (
  capsuleRoot: string,
  watchDir: string,
  appConfigPath: string,
  logger?: CodegenContext['logger'],
): CodegenContext => {
  // Diff-write: only write if content changed.
  const writeOut = (absPath: string, content: string): void => {
    try {
      const existing = existsSync(absPath) ? readFileSync(absPath, 'utf-8') : null;
      if (existing === content) return;
    } catch {
      // If read fails, fall through to write.
    }
    mkdirSync(dirname(absPath), { recursive: true });
    writeFileSync(absPath, content, 'utf-8');
  };

  const removeOut = (absPath: string): void => {
    if (existsSync(absPath)) rmSync(absPath);
  };

  const parseCtx = (source: string, isTs: boolean) =>
    parse(source, {
      sourceType: 'module',
      plugins: isTs ? ['typescript'] : [],
    });

  const namesCtx = (s: string) => names(s);

  const loadAppConfig = (): AppConfigResult => {
    if (!existsSync(appConfigPath)) return { status: 'missing' };
    try {
      const config = loadConfigFresh(appConfigPath) as AppConfigShape;
      return { status: 'ok', config };
    } catch (e) {
      return { status: 'error', error: e, configPath: appConfigPath };
    }
  };

  return {
    capsuleRoot,
    watchDir,
    appConfigPath,
    writeOut,
    removeOut,
    parse: parseCtx,
    names: namesCtx,
    loadAppConfig,
    logger,
  };
};

// ---------------------------------------------------------------------------
// Plugin props
// ---------------------------------------------------------------------------

export interface IOrchestratorProps {
  /** Absolute path to .capsule/ directory */
  capsuleRoot: string;
  /** Absolute path to apps/<app>/src/ */
  watchDir: string;
  /** Absolute path to apps/<app>/capsule.app.ts */
  appConfigPath: string;
  /**
   * Optional callback: called after appConfig is loaded.
   * Used by CompliancePlugin to read aliasKeys.
   */
  onAppConfigLoad?: (config: AppConfigShape) => void;
  /**
   * Optional extra sub-generators to register (e.g. playground-manifest).
   * Appended after the built-in generators; ordered by SubGenerator.order.
   */
  extraGenerators?: SubGenerator[];
}

// ---------------------------------------------------------------------------
// Main orchestrator factory
// ---------------------------------------------------------------------------

/**
 * Creates the unified CapsuleRegistry Vite plugin.
 *
 * Registers built-in sub-generators:
 *   10 — barrel-registry  (ADR-034 barrel tree + layer-types.d.ts)
 *   20 — endpoints        (endpoints.ts + api.d.ts + defineEndpoint transform)
 *   30 — app-config       (app-config.gen.ts + app-tags.d.ts + defineAppConfig transform)
 *   40 — packages         (registry/packages.ts + packages.d.ts)
 *   50 — docs-sources     (registry/docs-sources.ts — opt-in via capsule.app.ts docs: field)
 *   90 — bootstrap        (bootstrap.tsx — assembled last from contributions)
 *
 * Additional generators can be injected via opts.extraGenerators.
 */
export const createCapsuleRegistryPlugin = (opts: IOrchestratorProps): Plugin => {
  const { capsuleRoot, watchDir, appConfigPath, onAppConfigLoad, extraGenerators = [] } = opts;

  // Mutable logger ref — updated when Vite server becomes available.
  // Falls back to console so tests and buildStart work without configureServer.
  const loggerRef: CodegenContext['logger'] = {
    info: (msg) => console.info(msg),
    warn: (msg) => console.warn(msg),
    error: (msg) => console.error(msg),
  };

  const ctx = createContext(capsuleRoot, watchDir, appConfigPath, loggerRef);

  // Build the sub-gen registry (sorted by order).
  const appConfigSubGen = createAppConfigSubGenerator({ onAppConfigLoad });
  const packagesSubGen = createPackagesSubGenerator();
  const bootstrapSubGen = createBootstrapSubGenerator(() => allGenerators);

  const builtinGenerators: SubGenerator[] = [
    createBarrelRegistrySubGenerator(),
    createEndpointsSubGenerator(),
    appConfigSubGen,
    packagesSubGen,
    createDocsSourcesSubGenerator(),
    bootstrapSubGen,
  ];

  const allGenerators: SubGenerator[] = [...builtinGenerators, ...extraGenerators].sort(
    (a, b) => a.order - b.order,
  );

  let scanned = false;

  // --- Flush helpers ---

  const flushDirty = (forced = false) => {
    for (const gen of allGenerators) {
      gen.flush(ctx, forced);
    }
  };

  const dispatchEvent = (
    ev: 'add' | 'unlink' | 'change' | 'addDir' | 'unlinkDir',
    file: string,
  ) => {
    for (const gen of allGenerators) {
      if (gen.match(file)) {
        gen.onEvent(ev, file, ctx);
      }
    }
  };

  const dispatchAppConfigChange = () => {
    for (const gen of allGenerators) {
      gen.onAppConfigChange?.(ctx);
    }
    flushDirty();
  };

  // --- Initial scan (idempotent) ---
  const initialScan = async (absWatch: string) => {
    if (scanned) return;
    scanned = true;

    for (const file of await walkFiles(absWatch)) {
      dispatchEvent('add', file);
    }

    // Force flush all generators (even if not dirty — initial state must be written).
    flushDirty(true);
  };

  // --- Normalize path (cross-platform + query strips) ---
  const normalizePath = (p: string): string => p.split('?')[0].replace(/\\/g, '/');
  const targetAppConfigPath = normalizePath(appConfigPath);

  return {
    name: 'capsule-registry',
    enforce: 'pre',

    config(): UserConfig {
      // Merge all sub-gen config contributions.
      const result: UserConfig = {};
      for (const gen of allGenerators) {
        const contrib = gen.config?.(ctx);
        if (!contrib) continue;
        // Shallow merge resolve.alias
        if (contrib.resolve?.alias) {
          if (!result.resolve) result.resolve = {};
          if (!result.resolve.alias) result.resolve.alias = {};
          Object.assign(result.resolve.alias as Record<string, string>, contrib.resolve.alias);
        }
      }
      return result;
    },

    transform(code, id) {
      // Chain sub-gen transforms: first non-null wins.
      for (const gen of allGenerators) {
        if (!gen.transform) continue;
        const result = gen.transform(code, id, ctx);
        if (result !== null) return result;
      }
      return null;
    },

    async buildStart() {
      await initialScan(resolve(watchDir));
    },

    async configureServer(server: ViteDevServer) {
      // Wire the real Vite logger into the context so sub-generators can use it.
      loggerRef.info = (msg) => server.config.logger.info(msg);
      loggerRef.warn = (msg) => server.config.logger.warn(msg);
      loggerRef.error = (msg) => server.config.logger.error(msg);

      const absWatch = resolve(server.config.root, watchDir);
      await initialScan(absWatch);

      // Watch capsule.app.ts for changes.
      server.watcher.add(appConfigPath);
      server.watcher.on('change', (file) => {
        if (normalizePath(file) === targetAppConfigPath) {
          dispatchAppConfigChange();
        }
      });

      // Single watcher for all src/** — dispatches to matching sub-generators.
      watcherManager.init(server, absWatch);
      watcherManager.subscribe(absWatch, {
        onStructureChange: (event, paths) => {
          dispatchEvent(event as 'add' | 'unlink' | 'addDir' | 'unlinkDir', paths.file);
          flushDirty();
        },
      });
    },
  };
};

// Re-export LAYER_INIT_ORDER for backward compatibility (tests import it).
export { LAYER_INIT_ORDER };
