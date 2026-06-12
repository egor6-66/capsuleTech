/**
 * Manifest registry — thinly re-exports the canonical web-ui registry.
 *
 * The hand-authored manifests + lookup helpers live in
 * `@capsuletech/web-ui/manifest` post-S2 unification (2026-06-13).
 * Studio keeps this barrel for backwards compatibility of internal
 * imports and for the public `@capsuletech/studio/manifests` subpath.
 *
 * Studio-specific helpers (DnD validation `canDropInto`, `canMoveInto`)
 * live next door in `rules.ts`.
 */

export {
  canAcceptChild,
  getAllManifests,
  getCategories,
  getManifest,
  listByCategory,
  summarize,
} from '@capsuletech/web-ui/manifest';
