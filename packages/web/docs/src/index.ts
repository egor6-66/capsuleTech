/**
 * `@capsuletech/web-docs` — Solid runtime for the docs-as-data registry
 * (ADR 048 D5, extracted from `@capsuletech/web-studio/docs` per ADR 052
 * Phase 3.6).
 *
 * Consumers either:
 *   1. Build the registry per-package via `DocsExtractPlugin` and pass
 *      it through `<DocsProvider registry={...}>`, or
 *   2. Use the bundled root-vault registry shipped with this package:
 *      `import rootDocs from '@capsuletech/web-docs/docs.json'`.
 *
 * Types are re-exported from `@capsuletech/docs-builder` — single source
 * of truth for the registry shape.
 */

export { DocPage, type IDocPageProps } from './DocPage';
export { DocSection, type IDocSectionProps } from './DocSection';
export { DocsProvider, type IDocsProviderProps, useDocsRegistry } from './provider';
export { useDoc } from './useDoc';

export type {
  IAudience,
  IDocEntry,
  IDocMeta,
  IDocSection,
  IDocStatus,
  IDocsRegistry,
} from '@capsuletech/docs-builder';
