import type { IDocEntry } from '@capsuletech/docs-builder';
import { createResource, type Resource } from 'solid-js';
import { useContextRegistry } from './provider';
import { hasDocsSources, loadDoc } from './sources';

/**
 * Synchronous doc lookup — requires an active `<DocsProvider>`.
 *
 * Legacy / test API: when a Provider is mounted with an explicit
 * `registry`, components can resolve docs synchronously. Throws if
 * called outside Provider context.
 *
 * For lazy / config-driven flow (no Provider) use `useLazyDoc`.
 */
export const useDoc = (slug: string): IDocEntry | undefined => {
  const ctxRegistry = useContextRegistry();
  if (!ctxRegistry) {
    throw new Error(
      '[web-docs] useDoc() called outside <DocsProvider>. Wrap your app with ' +
        '<DocsProvider registry={...}/> for sync access, or use useLazyDoc(slug) ' +
        'which works with the config-driven sources registry.',
    );
  }
  return ctxRegistry[slug];
};

/**
 * Lazy doc lookup — works with the config-driven sources registry
 * populated by the auto-generated `.capsule/registry/docs-sources.ts`.
 *
 * Returns a Solid `Resource<IDocEntry | null>` — `.loading` / `.error`
 * work as usual; the value is `null` when the doc / source is missing.
 *
 * Throws if NO sources are registered AND no Provider context is set
 * — i.e. the docs feature was not wired up in `capsule.app.ts`.
 */
export const useLazyDoc = (slug: string): Resource<IDocEntry | null> => {
  const ctxRegistry = useContextRegistry();
  if (!ctxRegistry && !hasDocsSources()) {
    throw new Error(
      '[web-docs] useLazyDoc() called with no <DocsProvider> and no registered sources. ' +
        'Add docs: { rootVault, packages } to your apps/<app>/capsule.app.ts, or wrap ' +
        'a subtree in <DocsProvider registry={...}/> for explicit fixture mode.',
    );
  }
  const [resource] = createResource(
    () => slug,
    async (s): Promise<IDocEntry | null> => {
      if (ctxRegistry) return ctxRegistry[s] ?? null;
      return loadDoc(s);
    },
  );
  return resource;
};
