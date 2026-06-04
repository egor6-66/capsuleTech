import type { JSX } from 'solid-js';
import { setDefaultLocale, setLocale, setTenant } from './locale';
import { registerCopy, registerTenantCopy } from './registry';
import type { Dictionary, Locale, Tenant } from './types';

export interface IIntlProviderProps {
  /** Base dictionaries keyed by locale. Merged into the registry on mount. */
  dictionaries?: Partial<Record<Locale, Dictionary>>;
  /**
   * Per-tenant override dictionaries: `tenant → locale → Dictionary`.
   * Override only the keys that differ from base for that customer.
   */
  tenants?: Partial<Record<Tenant, Partial<Record<Locale, Dictionary>>>>;
  /** Locale to activate initially (unless one is already persisted). */
  locale?: Locale;
  /** Tenant override to activate initially. */
  tenant?: Tenant;
  /** Fallback locale used when the active locale lacks a key. */
  defaultLocale?: Locale;
  children?: JSX.Element;
}

/**
 * Convenience bootstrap for web-intl. State lives in module-level singletons
 * (so the UiProxy can resolve copy without threading Context), so this
 * Provider only seeds the registry + initial selection — it renders children
 * transparently. Solid runs the component body once, so registration is
 * one-shot.
 *
 * Persisted localStorage values win over the `locale`/`tenant` props, matching
 * the theme-switcher precedent: an explicit user choice survives reloads.
 */
export const IntlProvider = (props: IIntlProviderProps): JSX.Element => {
  for (const [loc, dict] of Object.entries(props.dictionaries ?? {})) {
    if (dict) registerCopy(loc, dict);
  }

  for (const [ten, byLocale] of Object.entries(props.tenants ?? {})) {
    for (const [loc, dict] of Object.entries(byLocale ?? {})) {
      if (dict) registerTenantCopy(ten, loc, dict);
    }
  }

  if (props.defaultLocale) setDefaultLocale(props.defaultLocale);

  const persistedLocale =
    typeof window !== 'undefined' && localStorage.getItem('capsule-locale');
  if (props.locale && !persistedLocale) setLocale(props.locale);

  const persistedTenant =
    typeof window !== 'undefined' && localStorage.getItem('capsule-tenant');
  if (props.tenant && !persistedTenant) setTenant(props.tenant);

  return props.children;
};
