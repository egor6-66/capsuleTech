/**
 * SubGenerator: bootstrap.tsx (assembler)
 *
 * Assembles .capsule/bootstrap.tsx from:
 *   1. LAYER_INIT_ORDER entries (legacy, always present — packages/app-config/routes)
 *   2. bootstrap() contributions from ALL other sub-generators (e.g. docs-sources)
 *
 * Must be flushed LAST (order: 90) so that all other sub-generators have
 * already run flush() and updated their internal state (including _hasFile)
 * before bootstrap collects their contributions.
 *
 * Bootstrap is re-generated whenever:
 *   - First run (forced=true during initialScan)
 *   - capsule.app.ts changes — because docs-sources (and other opt-in sub-gens)
 *     may start/stop contributing based on appConfig content
 *
 * LAYER_INIT_ORDER is preserved for backward compat with existing tests and
 * consumers that import it from capsuleRegistry.ts.
 *
 * order: 90 (last)
 */

import { resolve } from 'node:path';
import { generateBootstrap } from '../../capsuleRegistry';
import type { CodegenContext, SubGenerator } from '../interfaces';

export const createBootstrapSubGenerator = (
  _subGenerators: () => readonly SubGenerator[],
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
      // capsule.app.ts change may affect which sub-generators contribute to bootstrap.
      // For example: docs-sources sub-gen starts returning a contribution when
      // app config adds a `docs:` field. Bootstrap must be re-generated to pick
      // up the new import.
      dirty = true;
      return true;
    },

    flush(ctx, forced): void {
      if (!dirty && !forced) return;
      dirty = false;

      // Collect bootstrap contributions from all other sub-generators.
      // Generators are sorted by order (guaranteed by orchestrator) — we preserve
      // that order here by iterating allGenerators in order.
      // bootstrap() is called AFTER each sub-gen has already run flush() in this
      // same cycle (orchestrator flushes in order: 10→20→…→90), so _hasFile flags
      // are up-to-date when we reach here.
      const contributions = _subGenerators()
        .filter((g) => g.id !== 'bootstrap') // skip self
        .flatMap((g) => {
          const contrib = g.bootstrap?.(ctx);
          return contrib ? [contrib] : [];
        });

      ctx.writeOut(resolve(ctx.capsuleRoot, 'bootstrap.tsx'), generateBootstrap(contributions));
    },

    bootstrap(_ctx): null {
      // Bootstrap sub-gen doesn't contribute to its own output.
      return null;
    },
  };
};
