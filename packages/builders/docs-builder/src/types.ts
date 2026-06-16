/**
 * Public types for @capsuletech/docs-builder.
 * Canon: docs/_meta/docs-system.md §6
 */

/** Audience values per canon §2.2. */
export type IAudience = 'agent' | 'dev' | 'user' | 'report';

/** Doc status enum per canon §2.1. */
export type IDocStatus = 'proposed' | 'canon' | 'documented' | 'deprecated' | 'superseded';

/** Doc type, derived from path or explicit frontmatter. */
export type IDocType = 'adr' | 'guide' | 'ai-anchor' | 'canon' | 'brief';

/** Parsed frontmatter metadata for a doc. */
export interface IDocMeta {
  title?: string;
  status?: IDocStatus;
  tags?: string[];
  last_updated?: string;
  type?: IDocType;
  description?: string;
  audience?: IAudience[];
  date?: string;
  amended?: string;
  supersedes?: string;
  supersedes_partial?: string;
  /** Allow extra fields (legacy / custom). */
  [key: string]: unknown;
}

/** An audience block extracted from section body. */
export interface IAudienceBlock {
  audience: IAudience[];
  content: string;
  start: number;
  end: number;
}

/** A single parsed section (H2 or H3 only, per canon §1.5). */
export interface IDocSection {
  heading: string;
  level: 2 | 3;
  /** Present on H3 sections — ID of the parent H2. */
  parentId?: string;
  /** Raw markdown body (excluding heading line). */
  body: string;
  /** Resolved audience union for this section. */
  audience: IAudience[];
  /** Wikilinks found in section body. */
  wikilinks: string[];
}

/** A single doc entry in the registry. */
export interface IDocEntry {
  meta: IDocMeta;
  /** Map of sectionId → section. */
  sections: Record<string, IDocSection>;
  /** All wikilinks in the document (sorted, deduped). */
  wikilinks: string[];
}

/** The full docs registry: slug → entry. */
export type IDocsRegistry = Record<string, IDocEntry>;

/**
 * Slug derivation strategy.
 * - `docs`: root-relative path with numeric-prefix stripped from dirs (default for docs/).
 * - `package`: <pkg-short>/<...path>/<unit> — for per-package docs.
 * - `app`: app/<appName>/<...path>/<unit> — for per-app docs.
 */
export type ISlugStrategy = 'package' | 'app' | 'docs';

/** Options for extractDocs(). */
export interface IExtractDocsOptions {
  /** Absolute path to the root directory to walk. */
  root: string;
  /** Slug strategy to use. */
  strategy: ISlugStrategy;
  /**
   * Package or app name — used as slug prefix.
   * Required for `package` and `app` strategies.
   * For `package`: full name like `@capsuletech/web-core` or short like `web-core`.
   * For `app`: app name like `playground`.
   * For `docs`: ignored.
   */
  pkgName?: string;
  /** Extra glob patterns / file names to skip (added to DEFAULT_EXCLUSIONS). */
  extraExcludeFiles?: string[];
  /** Extra dir names to skip. */
  extraExcludeDirs?: string[];
}

/** Result of extractDocs(). */
export interface IExtractDocsResult {
  registry: IDocsRegistry;
  warnings: string[];
  errors: string[];
}
