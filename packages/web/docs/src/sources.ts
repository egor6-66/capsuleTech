/**
 * Lazy docs sources — singleton registry of pkg-short → loader.
 *
 * Populated by the auto-generated `.capsule/registry/docs-sources.ts`
 * file (emitted by capsule-registry's docs-sources sub-generator from
 * `apps/<app>/capsule.app.ts:docs.{rootVault, packages}`). Apps don't
 * import this file directly — they declare `docs:` in the config and
 * the wiring is automatic.
 *
 * Slug resolution: `<DocSection slug="web-ui/primitives/button"/>` →
 * prefix `web-ui` → loader from sources['web-ui'] → lazy `import()` →
 * cache promise → resolve doc entry.
 *
 * Root vault slugs (e.g. `architecture/adr/048-docs-as-data`) fall
 * back to sources['root'] when no matching prefix is registered.
 */

import type { IDocEntry, IDocsRegistry } from '@capsuletech/docs-builder';

/** Loader factory — `() => import('@capsuletech/<pkg>/docs.json')`. */
export type DocsSourceLoader = () => Promise<{ default: IDocsRegistry } | IDocsRegistry>;

const sources: Record<string, DocsSourceLoader> = {};
const cache: Record<string, Promise<IDocsRegistry>> = {};

/**
 * Register docs sources. Called by the generated
 * `.capsule/registry/docs-sources.ts` at bootstrap.
 *
 * Repeated calls merge — apps can register additional sources
 * dynamically (e.g. test fixtures).
 */
export const setDocsSources = (map: Record<string, DocsSourceLoader>): void => {
  Object.assign(sources, map);
};

/** True if at least one source is registered (auto-mode active). */
export const hasDocsSources = (): boolean => Object.keys(sources).length > 0;

/** Reset registry — for tests only. */
export const _resetDocsSources = (): void => {
  for (const k of Object.keys(sources)) delete sources[k];
  for (const k of Object.keys(cache)) delete cache[k];
};

const pickSourceKey = (docSlug: string): string | null => {
  const prefix = docSlug.split('/')[0];
  if (sources[prefix]) return prefix;
  if (sources.root) return 'root';
  return null;
};

const resolveLoader = (key: string): Promise<IDocsRegistry> => {
  if (!cache[key]) {
    cache[key] = sources[key]().then((mod) => {
      // Loader may return `{ default: registry }` (JSON import) or the
      // registry directly (legacy / test fixtures).
      return ('default' in mod ? mod.default : mod) as IDocsRegistry;
    });
  }
  return cache[key];
};

/**
 * Resolve a single doc entry by slug from the lazy sources map.
 * Returns `null` if no matching source is registered or the doc is
 * missing in the loaded registry.
 *
 * Triggers lazy `import()` on first call per source; subsequent calls
 * for the same source hit the cache.
 */
export const loadDoc = async (slug: string): Promise<IDocEntry | null> => {
  const [docSlug] = slug.split('#');
  if (!docSlug) return null;
  const key = pickSourceKey(docSlug);
  if (!key) return null;
  const registry = await resolveLoader(key);
  return registry[docSlug] ?? null;
};

/** Eagerly resolve the entire registry for a source key — for tooling. */
export const loadRegistry = async (key: string): Promise<IDocsRegistry | null> => {
  if (!sources[key]) return null;
  return resolveLoader(key);
};
