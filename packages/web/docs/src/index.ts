/**
 * `@capsuletech/web-docs` — Solid runtime for the docs-as-data registry.
 *
 * Two flows supported:
 *
 *   1. **Config-driven (default).** Apps declare `docs: { rootVault, packages }`
 *      in `apps/<app>/capsule.app.ts`. The capsule-registry's docs-sources
 *      sub-generator emits `.capsule/registry/docs-sources.ts` which calls
 *      `setDocsSources(...)` at bootstrap. Components like `<DocSection>` /
 *      `<DocPage>` / `useLazyDoc(slug)` resolve by slug-prefix dispatch +
 *      lazy `import()` per source.
 *
 *   2. **Explicit registry (escape hatch).** Wrap a subtree in
 *      `<DocsProvider registry={...}>` to inject a fixed registry — useful
 *      for tests, isolated previews, or one-off views. Components consult
 *      the context registry synchronously via `useDoc(slug)`.
 *
 * The bundled root-vault registry (capsule's own `docs/`) is available at
 * `@capsuletech/web-docs/docs.json` and is loaded automatically when
 * `docs.rootVault: true` is set in the app config.
 *
 * Types are re-exported from `@capsuletech/docs-builder` — single source
 * of truth for the registry shape.
 */

export type {
  IAudience,
  IDocEntry,
  IDocMeta,
  IDocSection,
  IDocStatus,
  IDocsRegistry,
} from '@capsuletech/docs-builder';
export { DocPage, type IDocPageProps } from './DocPage';
export { DocSection, type IDocSectionProps } from './DocSection';
export { DocsProvider, type IDocsProviderProps, useContextRegistry } from './provider';
export { renderMarkdown } from './render-markdown';
export {
  _resetDocsSources,
  type DocsSourceLoader,
  hasDocsSources,
  loadDoc,
  loadRegistry,
  setDocsSources,
} from './sources';
export { useDoc, useLazyDoc } from './useDoc';
