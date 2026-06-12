/**
 * `@capsuletech/web-ui/manifest` — unified per-primitive manifest registry
 * (post-S2 audit consolidation, 2026-06-13).
 *
 * Hand-authored fields (category, icon, defaultProps, propsSchema, DnD-rules)
 * live in `src/manifest/manifests/*.tsx`. Auto-generated bundle-cost fields
 * (sizeKB, externals, weight, subpath) are merged by `scripts/build-manifest.mjs`
 * into `dist/manifest.json` at build time (W4 follow-up).
 *
 * Consumed by `@capsuletech/studio` palette + inspector + DnD validation
 * (the studio `/manifests` subpath thinly re-exports from here).
 */

export {
  canAcceptChild,
  getAllManifests,
  getCategories,
  getManifest,
  listByCategory,
  summarize,
} from './registry';
export type {
  ComponentCategory,
  IComponentManifest,
  IManifestSummary,
  IPrimitiveManifestEntry,
  IWebUiManifest,
} from './types';
