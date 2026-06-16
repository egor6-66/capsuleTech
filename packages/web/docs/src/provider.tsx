import type { IDocsRegistry } from '@capsuletech/docs-builder';
import { createContext, type JSX, useContext } from 'solid-js';

const DocsContext = createContext<IDocsRegistry>();

export interface IDocsProviderProps {
  /**
   * Docs registry — typically built by `DocsExtractPlugin` (per-package
   * `dist/docs.json`) or supplied by the consumer. See ADR 048 D4 / ADR 052.
   *
   * Example:
   * ```tsx
   * import rootDocs from '@capsuletech/web-docs/docs.json';
   * <DocsProvider registry={rootDocs}>...</DocsProvider>
   * ```
   */
  registry: IDocsRegistry;
  children: JSX.Element;
}

/**
 * Context provider for the docs registry. Wrap once at the app root so
 * descendant `<DocSection>`/`<DocPage>` components can resolve slugs.
 */
export const DocsProvider = (props: IDocsProviderProps): JSX.Element => (
  <DocsContext.Provider value={props.registry}>{props.children}</DocsContext.Provider>
);

/** Throw-on-missing accessor for the docs registry. */
export const useDocsRegistry = (): IDocsRegistry => {
  const ctx = useContext(DocsContext);
  if (!ctx) {
    throw new Error(
      '[web-docs] useDocsRegistry() called outside <DocsProvider>. Wrap your app with <DocsProvider registry={...}/>',
    );
  }
  return ctx;
};