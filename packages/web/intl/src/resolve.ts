import { getDefaultLocale, getLocale, getTenant } from './locale';
import { getBaseDict, getTenantDict, registryVersion } from './registry';
import type { CopyResolver } from './types';

/**
 * Resolve a copy key against the active locale/tenant — reactive.
 *
 * Fallback chain (first hit wins):
 *  1. tenant override @ active locale
 *  2. base @ active locale
 *  3. tenant override @ default locale
 *  4. base @ default locale
 *  5. caller-supplied `fallback`
 *  6. the key itself — so missing copy is visible, never a blank node
 *
 * Reads `registryVersion()` + the locale/tenant signals so the call re-runs
 * when either the active selection or the registered dictionaries change.
 */
export const resolveCopy: CopyResolver = (key, fallback) => {
  // Track late dictionary registration.
  registryVersion();

  const locale = getLocale();
  const tenant = getTenant();
  const defaultLocale = getDefaultLocale();

  const fromTenant = (loc: string): string | undefined => {
    if (!tenant || !loc) return undefined;
    const dict = getTenantDict(tenant, loc);
    return dict && key in dict ? dict[key] : undefined;
  };

  const fromBase = (loc: string): string | undefined => {
    if (!loc) return undefined;
    const dict = getBaseDict(loc);
    return dict && key in dict ? dict[key] : undefined;
  };

  const hit =
    fromTenant(locale) ??
    fromBase(locale) ??
    (defaultLocale !== locale
      ? (fromTenant(defaultLocale) ?? fromBase(defaultLocale))
      : undefined);

  return hit ?? fallback ?? key;
};

/**
 * Hook returning the reactive resolver. Ergonomic alias for `resolveCopy`:
 *
 * ```tsx
 * const t = useCopy();
 * <h1>{t('login.title')}</h1>
 * ```
 *
 * The web-core UiProxy consumes this same resolver to auto-inject text into
 * meta-tagged nodes, so Views stay literal-free.
 */
export const useCopy = (): CopyResolver => resolveCopy;
