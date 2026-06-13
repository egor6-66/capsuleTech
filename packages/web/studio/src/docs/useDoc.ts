import { useDocsRegistry } from './provider';
import type { IDocEntry } from './types';

/**
 * Lookup a doc entry by slug. Returns undefined if the registry has no
 * matching entry. Use `useDocsRegistry()` directly for full registry
 * iteration / search use cases.
 */
export const useDoc = (slug: string): IDocEntry | undefined => {
  const registry = useDocsRegistry();
  return registry[slug];
};
