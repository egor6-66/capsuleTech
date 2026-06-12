/**
 * Manifest types — Web UI bundle manifest schema.
 *
 * Canon: docs/_meta/web-ui.md section "Weight gradient & size manifest".
 * Used by:
 *   - scripts/build-manifest.ts (generator)
 *   - packages/web/ui/test/bundle-size.test.ts (assertions)
 *   - @capsuletech/web-creator studio palette (consumer, future)
 */

/**
 * Per-primitive entry in the bundle manifest.
 *
 * Every field except slotTags/variants is required and populated by
 * the manifest generator script.
 */
export interface IPrimitiveManifestEntry {
  /** Primitive display name, e.g. 'Button', 'Card'. */
  name: string;
  /**
   * Weight category — for narrative / filter.
   *   L0 — presentational + native controls (no floating-ui / focus-trap / keyboard pattern).
   *   L1 — interactive with a11y-pattern overhead (Kobalte interactive, floating-ui, portal).
   * Real cost is in sizeKB — this is a categorical tag for UX sorting/filtering in studio.
   */
  weight: 'L0' | 'L1';
  /** Subpath import string, e.g. '@capsuletech/web-ui/button'. */
  subpath: string;
  /** Real gzip cost (kB), measured at build time. */
  sizeKB: number;
  /**
   * External deps remaining in graph after tree-shake.
   * These are deps that the consumer MUST supply (peerDeps).
   * Example: ['@kobalte/core/dropdown-menu', 'solid-js'].
   */
  externals: string[];
  /**
   * Slot tags for UiProxy meta-routing (optional).
   * Populated if the component exposes data-slot attributes.
   */
  slotTags?: string[];
  /**
   * CVA variant options available on the component (optional).
   * Populated from CVA definitions for inspector dropdown.
   * Example: { variant: ['default', 'outline', 'ghost'], size: ['sm', 'default', 'lg'] }
   */
  variants?: Record<string, string[]>;
}

/** Root manifest shape emitted to dist/manifest.json. */
export interface IWebUiManifest {
  /** Semver of @capsuletech/web-ui that generated this manifest. */
  version: string;
  /** ISO timestamp of generation. */
  generatedAt: string;
  primitives: IPrimitiveManifestEntry[];
}
