import type { IDocEntry } from '@capsuletech/docs-builder';
import { useDocsRegistry } from './provider';

/**
 * Lookup a doc entry by slug. Returns undefined if the registry has no
 * matching entry. Use `useDocsRegistry()` directly for full registry
 * iteration / search use cases.
 */
export const useDoc = (slug: string): IDocEntry | undefined => {
  const registry = useDocsRegistry();
  return registry[slug];
};