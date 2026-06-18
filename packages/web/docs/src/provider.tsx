import type { IDocsRegistry } from '@capsuletech/docs-builder';
import { createContext, type JSX, useContext } from 'solid-js';

/**
 * Context-injected registry — opt-in escape hatch. When set, descendant
 * `<DocSection>` / `<DocPage>` / `useDoc` resolve synchronously against
 * this registry instead of the lazy sources singleton.
 *
 * Primary use case — tests / isolated previews where you want to inject
 * a fixture without touching the global sources.
 *
 * Default flow: no `<DocsProvider>` needed. The auto-generated
 * `.capsule/registry/docs-sources.ts` populates the sources singleton at
 * bootstrap, and components lazy-load via slug-prefix dispatch.
 */
const DocsContext = createContext<IDocsRegistry | null>(null);

export interface IDocsProviderProps {
  registry: IDocsRegistry;
  children: JSX.Element;
}

export const DocsProvider = (props: IDocsProviderProps): JSX.Element => (
  <DocsContext.Provider value={props.registry}>{props.children}</DocsContext.Provider>
);

/** Returns the context registry if a `<DocsProvider>` is active, else null. */
export const useContextRegistry = (): IDocsRegistry | null => useContext(DocsContext) ?? null;
