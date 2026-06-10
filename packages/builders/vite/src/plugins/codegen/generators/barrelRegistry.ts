/**
 * SubGenerator: barrel-registry (ADR-034)
 *
 * Generates .capsule/registry/** barrel-tree:
 *   - registry/index.ts          → export * as Widgets from './widgets'; …
 *   - registry/<layer>/index.ts  → export * as Folder from './folder'; (mid-nodes)
 *                                   export { default as Leaf } from '@<layer>/...'; (leaves)
 *   - registry/package.json      → { "sideEffects": false }
 *   - @types/layer-types.d.ts    → ambient namespace type-members for Features/Controllers/Entities
 *
 * Also removes legacy wrappers.ts / slots.d.ts if they still exist from
 * a pre-ADR-034 run.
 *
 * order: 10 (first — no deps on other sub-gens)
 */

import { resolve } from 'node:path';
import {
  generateBarrelRegistry,
  generateLayerTypes,
  type WrapperLeaf,
  wrapperFileToLeaf,
} from '../../capsuleRegistry';
import { LAYER_TO_NAMESPACE } from '../../constants';
import type { SubGenerator } from '../interfaces';

const LAYER_DIRS = Object.keys(LAYER_TO_NAMESPACE) as Array<keyof typeof LAYER_TO_NAMESPACE>;

const LEGACY_WRAPPERS = (capsuleRoot: string) => resolve(capsuleRoot, 'registry', 'wrappers.ts');
const LEGACY_SLOTS = (capsuleRoot: string) => resolve(capsuleRoot, '@types', 'slots.d.ts');

export const createBarrelRegistrySubGenerator = (): SubGenerator => {
  const knownWrappers = new Map<string, WrapperLeaf>();
  let dirty = false;

  return {
    id: 'barrel-registry',
    order: 10,

    match(_file: string): boolean {
      // Matches any file under the watched src/ — wrapperFileToLeaf filters by layer dir.
      // We match everything here and let onEvent do the layer filtering.
      return true;
    },

    onEvent(ev, file, ctx): boolean {
      const leaf = wrapperFileToLeaf(file, ctx.watchDir, LAYER_DIRS);
      if (!leaf) return false;
      const key = `${leaf.layer}::${leaf.segments.join('/')}`;
      if (ev === 'add' || ev === 'addDir') {
        knownWrappers.set(key, leaf);
      } else if (ev === 'unlink' || ev === 'unlinkDir') {
        knownWrappers.delete(key);
      }
      // 'change' on a wrapper file doesn't affect registry structure.
      dirty = true;
      return true;
    },

    flush(ctx, forced): void {
      if (!dirty && !forced) return;
      dirty = false;

      const leaves = [...knownWrappers.values()].sort((a, b) => {
        if (a.layer !== b.layer) return a.layer.localeCompare(b.layer);
        return a.segments.join('/').localeCompare(b.segments.join('/'));
      });

      const registryDir = resolve(ctx.capsuleRoot, 'registry');
      const barrelFiles = generateBarrelRegistry(leaves);
      for (const [relPath, content] of barrelFiles) {
        ctx.writeOut(resolve(registryDir, relPath), content);
      }

      // Regenerate layer-types.d.ts alongside barrel registry.
      ctx.writeOut(
        resolve(ctx.capsuleRoot, '@types', 'layer-types.d.ts'),
        generateLayerTypes(leaves),
      );

      // Remove legacy files from pre-ADR-034 runs.
      ctx.removeOut(LEGACY_WRAPPERS(ctx.capsuleRoot));
      ctx.removeOut(LEGACY_SLOTS(ctx.capsuleRoot));
    },

    bootstrap(_ctx): null {
      // Barrel registry is not bootstrapped via side-effect import (ADR-034).
      // Namespaces are tree-shaken per-route via auto-import.
      return null;
    },

    config(ctx): import('vite').UserConfig {
      // Register '@capsule/registry' alias so Vite dev-resolver can find it.
      // Must be returned from config() (not configResolved) so it is applied
      // before Vite builds its dev-resolver.
      const registryIndexPath = resolve(ctx.capsuleRoot, 'registry', 'index.ts');
      return {
        resolve: {
          alias: {
            '@capsule/registry': registryIndexPath,
          },
        },
      };
    },
  };
};
