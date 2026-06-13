import { createContext, type JSX, useContext } from 'solid-js';
import type { IDocsRegistry } from './types';

const DocsContext = createContext<IDocsRegistry>();

export interface IDocsProviderProps {
  /**
   * Docs registry — Apps build it from `docs/.generated/registry.ts` and
   * pass through. See [[048-docs-as-data|ADR 048]] D4.
   *
   * Example:
   * ```tsx
   * import { docs } from '@/.capsule/docs-registry';
   * <DocsProvider registry={docs}>...</DocsProvider>
   * ```
   */
  registry: IDocsRegistry;
  children: JSX.Element;
}

/**
 * Context provider for the docs registry. Wrap once at the app root (or
 * studio-shell root) so descendant `<DocSection>`/`<DocPage>` components
 * can resolve slugs.
 */
export const DocsProvider = (props: IDocsProviderProps): JSX.Element => (
  <DocsContext.Provider value={props.registry}>{props.children}</DocsContext.Provider>
);

/** Throw-on-missing accessor for the docs registry. */
export const useDocsRegistry = (): IDocsRegistry => {
  const ctx = useContext(DocsContext);
  if (!ctx) {
    throw new Error(
      '[studio/docs] useDocsRegistry() called outside <DocsProvider>. Wrap your app or studio-shell with <DocsProvider registry={...}/>',
    );
  }
  return ctx;
};
