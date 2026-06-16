/**
 * @capsuletech/docs-builder — public API.
 * Canon: docs/_meta/docs-system.md
 */

export { extractDocs } from './extract.js';
export type {
  IDocsRegistry,
  IDocEntry,
  IDocSection,
  IDocMeta,
  IAudience,
  IDocStatus,
  IDocType,
  ISlugStrategy,
  IExtractDocsOptions,
  IExtractDocsResult,
} from './types.js';
export { DEFAULT_EXCLUSIONS, shouldExcludeFile, shouldExcludeDir } from './exclusions.js';
export { slugFromPath } from './slug.js';
