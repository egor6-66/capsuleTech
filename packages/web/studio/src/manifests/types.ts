/**
 * Manifest types — re-exported from `@capsuletech/web-ui/manifest`.
 *
 * Pre-S2 (2026-06-13), studio owned `IComponentManifest` + per-primitive
 * manifest files. Post-S2 unification — single source of truth in web-ui
 * kit (composition rule canon: raw manifests live with their primitives).
 *
 * Studio's `/manifests` subpath stays as a stable surface for backwards
 * compatibility and for studio-specific helpers (rules.ts DnD validation).
 */

export type {
  ComponentCategory,
  IComponentManifest,
  IManifestSummary,
  IPrimitiveManifestEntry,
} from '@capsuletech/web-ui/manifest';
