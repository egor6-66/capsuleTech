/**
 * `@capsuletech/web-ui/manifest` — unified per-primitive manifest registry
 * (post-S2 audit consolidation, 2026-06-13).
 *
 * Hand-authored fields (category, icon, defaultProps, propsSchema, DnD-rules)
 * live in `src/manifest/manifests/*.tsx`. Auto-generated bundle-cost fields
 * (sizeKB, externals, weight, subpath) are merged by `scripts/build-manifest.mjs`
 * into `dist/manifest.json` at build time (W4 follow-up).
 *
 * Consumed by `@capsuletech/web-studio` palette + inspector + DnD validation
 * (the web-studio `/manifests` subpath thinly re-exports from here).
 */

export {
  applyFieldRule,
  canAcceptChild,
  getAllManifests,
  getCategories,
  getContract,
  getManifest,
  getPresets,
  hasPresets,
  listByCategory,
  summarize,
} from './registry';
export type {
  ComponentCategory,
  FieldRule,
  IBuiltManifestEntry,
  IFieldRuleResult,
  IManifestSummary,
  IPreset,
  IPrimitiveManifestEntry,
  IWebUiManifest,
} from './types';
