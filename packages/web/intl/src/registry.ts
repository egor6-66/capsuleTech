import { createSignal } from 'solid-js';
import type { Dictionary, ICopyBundle, Locale, Tenant } from './types';

/**
 * Dictionary registry - the storage side of web-intl.
 *
 * Two flat maps:
 *  - baseRegistry:   locale -> merged Dictionary
 *  - tenantRegistry: "tenant::locale" -> merged Dictionary (overrides base)
 *
 * Registration is additive and happens at app bootstrap (usually via
 * IntlProvider). Mutating a Map is not reactive on its own, so every
 * register* call bumps registryVersion - resolveCopy reads it to re-resolve
 * when dictionaries arrive late (e.g. a lazy-loaded locale bundle).
 */

const baseRegistry = new Map<Locale, Dictionary>();
const tenantRegistry = new Map<string, Dictionary>();

const [registryVersion, bumpRegistryVersion] = createSignal(0);

/** Reactive registration counter - read by the resolver to track late merges. */
export { registryVersion };

const tenantKey = (tenant: Tenant, locale: Locale): string =>
  `${tenant}::${locale}`;

const mergeInto = (
  store: Map<string, Dictionary>,
  key: string,
  dict: Dictionary,
): void => {
  const existing = store.get(key);
  store.set(key, existing ? { ...existing, ...dict } : { ...dict });
};

/** Register (merge) a base dictionary for a locale. */
export function registerCopy(locale: Locale, dict: Dictionary): void;
/** Register (merge) a tagged copy bundle. */
export function registerCopy(bundle: ICopyBundle): void;
export function registerCopy(
  arg: Locale | ICopyBundle,
  dict?: Dictionary,
): void {
  if (typeof arg === 'string') {
    mergeInto(baseRegistry, arg, dict ?? {});
  } else if (arg.tenant) {
    mergeInto(tenantRegistry, tenantKey(arg.tenant, arg.locale), arg.dict);
  } else {
    mergeInto(baseRegistry, arg.locale, arg.dict);
  }
  bumpRegistryVersion((v) => v + 1);
}

/** Register (merge) a tenant override dictionary for a locale. */
export function registerTenantCopy(
  tenant: Tenant,
  locale: Locale,
  dict: Dictionary,
): void {
  mergeInto(tenantRegistry, tenantKey(tenant, locale), dict);
  bumpRegistryVersion((v) => v + 1);
}

/** Look up a base dictionary (non-reactive). */
export const getBaseDict = (locale: Locale): Dictionary | undefined =>
  baseRegistry.get(locale);

/** Look up a tenant-override dictionary (non-reactive). */
export const getTenantDict = (
  tenant: Tenant,
  locale: Locale,
): Dictionary | undefined => tenantRegistry.get(tenantKey(tenant, locale));

/** All locales that have at least one registered base dictionary (non-reactive). */
export const getRegisteredLocales = (): Locale[] =>
  [...baseRegistry.keys()].sort();

/** Test-only: wipe both registries and reset the version signal. */
export const __resetRegistry = (): void => {
  baseRegistry.clear();
  tenantRegistry.clear();
  bumpRegistryVersion(0);
};
