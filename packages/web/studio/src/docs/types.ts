/**
 * Public types for the studio docs consumer.
 *
 * The shape mirrors the extractor output (`docs/_build/extract.mjs` →
 * `docs/.generated/registry.ts`) per docs-system canon §6. Apps supply
 * a conforming registry to `<DocsProvider>`; studio components consume
 * it via context.
 *
 * Owned here (not re-imported from extractor output) because the
 * `docs/.generated/` artifact lives outside the studio package and is
 * gitignored — studio needs to compile without it.
 */

/** Audience tag per docs-system canon §3.3. */
export type Audience = 'agent' | 'dev' | 'user' | 'report';

/** Frontmatter status per docs-system canon §2.1. */
export type DocStatus = 'proposed' | 'canon' | 'documented' | 'deprecated' | 'superseded';

export interface IDocMeta {
  /** H1 heading or explicit frontmatter title. */
  title?: string;
  /** Frontmatter `description:` one-liner. */
  description?: string;
  status?: DocStatus | string;
  type?: string;
  tags?: string[];
  /** Doc creation date (ADR-style, immutable). */
  date?: string;
  /** Last-touched date (CI-validated). */
  last_updated?: string;
  /** Default audience for sections without their own audience-block. */
  audience: Audience[];
  /** Passthrough for additional frontmatter keys. */
  [key: string]: unknown;
}

export interface IDocSection {
  heading: string;
  level: number;
  /** Parent section id for H3 (set when H3 nests under H2 with explicit id). */
  parentId?: string;
  /** Raw markdown of section content (audience-comments preserved). */
  body: string;
  /** Resolved audience (section block overrides frontmatter default). */
  audience: Audience[];
  /** Outgoing wikilinks collected from body. */
  wikilinks: string[];
}

export interface IDocEntry {
  meta: IDocMeta;
  /** Section id → section. */
  sections: Record<string, IDocSection>;
  /** Doc-level union of section wikilinks. */
  wikilinks: string[];
}

/** Registry consumed by `<DocsProvider>`. Slug → doc entry. */
export type IDocsRegistry = Record<string, IDocEntry>;
