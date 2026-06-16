/**
 * @capsuletech/docs — root docs package.
 *
 * This package wraps the root docs/ directory and emits dist/docs.json
 * at build time via DocsExtractPlugin (ADR 052 D5 — Phase 3.3).
 *
 * Consumers import the docs registry via:
 *   import rootDocs from '@capsuletech/docs/docs.json';
 *
 * The actual docs.json is generated during `pnpm --filter @capsuletech/docs build`.
 *
 * This index.ts is a placeholder — the package's value is in dist/docs.json.
 */

// Re-export types from docs-builder for consumers who want to type the registry.
export type { IDocEntry, IDocMeta, IDocSection, IDocsRegistry } from '@capsuletech/docs-builder';
