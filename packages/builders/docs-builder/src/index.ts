/**
 * @capsuletech/docs-builder — public API.
 * Canon: docs/_meta/docs-system.md
 *
 * The package owns the full docs pipeline:
 *  - extractDocs()      — pure engine (markdown → registry).
 *  - DocsExtractPlugin  — Vite plugin (emits dist/docs.json at build time).
 *  - bin (capsule-docs) — CLI for ad-hoc extraction.
 *
 * Per ADR 052 D2, consumers opt-in explicitly:
 *   libConfig({ plugins: [DocsExtractPlugin({ ... })] })
 */

export { DEFAULT_EXCLUSIONS, shouldExcludeDir, shouldExcludeFile } from './exclusions.js';
export { extractDocs } from './extract.js';
export type { IDocsExtractPluginOptions, IDocsSlugStrategy } from './plugin.js';
export { DocsExtractPlugin } from './plugin.js';
export { slugFromPath } from './slug.js';
export type {
  IAudience,
  IDocEntry,
  IDocMeta,
  IDocSection,
  IDocStatus,
  IDocsRegistry,
  IDocType,
  IExtractDocsOptions,
  IExtractDocsResult,
  ISlugStrategy,
} from './types.js';
