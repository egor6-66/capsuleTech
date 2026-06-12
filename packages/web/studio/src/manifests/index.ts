/**
 * Studio's `/manifests` subpath — backwards-compatible barrel post-S2
 * audit unification (2026-06-13). The canonical per-primitive registry
 * lives in `@capsuletech/web-ui/manifest`; this file re-exports it
 * alongside studio-specific DnD validation helpers (`rules.ts`).
 */

export {
  canAcceptChild,
  getAllManifests,
  getCategories,
  getManifest,
  listByCategory,
  summarize,
} from './registry';
export { acceptsChildren, canDropInto, canMoveInto, isInside } from './rules';
export type {
  ComponentCategory,
  IComponentManifest,
  IManifestSummary,
  IPrimitiveManifestEntry,
} from './types';
