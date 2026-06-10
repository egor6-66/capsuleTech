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
import { createEndpointsSubGenerator } from './generators/endpoints';
import { createPackagesSubGenerator } from './generators/packages';
import type { AppConfigShape, CodegenContext, SubGenerator } from './interfaces';

// ---------------------------------------------------------------------------
// CodegenContext factory
// ---------------------------------------------------------------------------

const loadConfigFresh = (configPath: string): unknown => {
  const j = createJiti(import.meta.url, { interopDefault: true, moduleCache: false });
  const mod = j(configPath) as { default?: unknown } | unknown;
  return (mod as { default?: unknown })?.default ?? mod;
};

const createContext = (
  capsuleRoot: string,
  watchDir: string,
  appConfigPath: string,
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

  const loadAppConfig = (): AppConfigShape | undefined => {
    if (!existsSync(appConfigPath)) return undefined;
    try {
      return loadConfigFresh(appConfigPath) as AppConfigShape;
    } catch (e) {
      console.error('[capsule-registry] failed to load', appConfigPath, e);
      return undefined;
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
 *   90 — bootstrap        (bootstrap.tsx — assembled last from contributions)
 *
 * Additional generators can be injected via opts.extraGenerators.
 */
export const createCapsuleRegistryPlugin = (opts: IOrchestratorProps): Plugin => {
  const { capsuleRoot, watchDir, appConfigPath, onAppConfigLoad, extraGenerators = [] } = opts;

  const ctx = createContext(capsuleRoot, watchDir, appConfigPath);

  // Build the sub-gen registry (sorted by order).
  const appConfigSubGen = createAppConfigSubGenerator({ onAppConfigLoad });
  const packagesSubGen = createPackagesSubGenerator();
  const bootstrapSubGen = createBootstrapSubGenerator(() => allGenerators);

  const builtinGenerators: SubGenerator[] = [
    createBarrelRegistrySubGenerator(),
    createEndpointsSubGenerator(),
    appConfigSubGen,
    packagesSubGen,
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
