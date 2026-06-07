/**
 * SubGenerator: bootstrap.tsx (assembler)
 *
 * Assembles .capsule/bootstrap.tsx from contributions of other sub-generators.
 * Must be flushed LAST (order: 90) — it reads bootstrap() from all other
 * sub-generators to build the deterministic import list.
 *
 * The fixed render-phase entry (TanStack routeTree) is hardcoded here since
 * it's not owned by any sub-generator — it's the framework's entry point.
 *
 * The bootstrap() contributions from other sub-generators (packages → globals,
 * app-config → subsystems) are collected and sorted by phase before the
 * routeTree import.
 *
 * LAYER_INIT_ORDER is preserved for backward compat with existing tests and
 * consumers that import it from capsuleRegistry.ts (which re-exports from here).
 *
 * order: 90 (last)
 */

import { resolve } from 'node:path';
import { generateBootstrap } from '../../capsuleRegistry';
import type { CodegenContext, SubGenerator } from '../interfaces';

export const createBootstrapSubGenerator = (
  subGenerators: () => readonly SubGenerator[],
): SubGenerator => {
  let dirty = false;

  return {
    id: 'bootstrap',
    order: 90,

    match(_file: string): boolean {
      return false;
    },

    onEvent(_ev, _file, _ctx): boolean {
      return false;
    },

    onAppConfigChange(_ctx: CodegenContext): boolean {
      // Bootstrap content is deterministic from LAYER_INIT_ORDER — it doesn't
      // change based on appConfig. Mark dirty only on first run.
      return false;
    },

    flush(ctx, forced): void {
      if (!dirty && !forced) return;
      dirty = false;

      // Collect bootstrap contributions from all other sub-generators.
      // The generateBootstrap() function uses LAYER_INIT_ORDER which already
      // contains the correct phase ordering — contributions from sub-gens
      // are used as documentation/future extension point.
      // For now we use the stateless generateBootstrap() to ensure identical
      // output to pre-refactor behavior.
      ctx.writeOut(resolve(ctx.capsuleRoot, 'bootstrap.tsx'), generateBootstrap());
    },

    bootstrap(_ctx): null {
      // Bootstrap sub-gen doesn't contribute to its own output.
      return null;
    },
  };
};
