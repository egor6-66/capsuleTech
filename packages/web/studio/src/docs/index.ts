/**
 * `@capsuletech/web-studio/docs` — JSX consumer for the docs-as-data registry
 * (ADR 048 D5).
 *
 * Apps build the registry from `docs/.generated/registry.ts` (extractor
 * output per ADR 048 D4) and supply it via `<DocsProvider registry={docs}>`.
 * Descendant `<DocSection>` / `<DocPage>` components resolve slugs from
 * the context registry; `useDoc(slug)` exposes raw entries for programmatic
 * access.
 *
 * Composition rule canon — studio is the host/composer; the registry
 * source lives in app land. Studio just renders.
 */

export { DocPage, type IDocPageProps } from './DocPage';
export { DocSection, type IDocSectionProps } from './DocSection';
export { DocsProvider, type IDocsProviderProps, useDocsRegistry } from './provider';
export type {
  Audience,
  DocStatus,
  IDocEntry,
  IDocMeta,
  IDocSection,
  IDocsRegistry,
} from './types';
export { useDoc } from './useDoc';
