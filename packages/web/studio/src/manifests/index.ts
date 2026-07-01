/**
 * Studio's `/manifests` subpath — backwards-compatible barrel post-S2
 * audit unification (2026-06-13). The canonical per-primitive registry
 * lives in `@capsuletech/web-ui/manifest`; this file just re-exports it.
 */

export {
  canAcceptChild,
  getAllManifests,
  getCategories,
  getManifest,
  listByCategory,
  summarize,
} from './registry';
export { acceptsChildren, manifestsForNode } from './rules';
export type {
  ComponentCategory,
  IManifestSummary,
  IPrimitiveManifestEntry,
} from './types';
