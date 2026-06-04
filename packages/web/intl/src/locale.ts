import { type Accessor, createSignal } from 'solid-js';
import { getRegisteredLocales, registryVersion } from './registry';
import type { Locale, Tenant } from './types';

/**
 * Active locale / tenant state — the reactive switch that drives resolution.
 *
 * Mirrors `@capsuletech/web-style`'s theme signal: module-level singletons,
 * persisted to localStorage, applied imperatively. Switching the locale
 * re-runs every `resolveCopy` call (which reads `locale()`), swapping all
 * rendered copy with zero per-View work.
 */

const LOCALE_STORAGE_KEY = 'capsule-locale';
const TENANT_STORAGE_KEY = 'capsule-tenant';

const [defaultLocale, setDefaultLocaleSignal] = createSignal<Locale>('');

const initialLocale = (): Locale => {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem(LOCALE_STORAGE_KEY) ?? '';
};

const initialTenant = (): Tenant | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TENANT_STORAGE_KEY);
};

const [locale, setLocaleSignal] = createSignal<Locale>(initialLocale());
const [tenant, setTenantSignal] = createSignal<Tenant | null>(initialTenant());

/** Reactive accessor for the active locale. Empty string until set/registered. */
export const useLocale = (): Accessor<Locale> => locale;

/** Reactive accessor for the active tenant override (`null` = base copy). */
export const useTenant = (): Accessor<Tenant | null> => tenant;

/** Reactive accessor for the fallback locale used when a key is missing. */
export const useDefaultLocale = (): Accessor<Locale> => defaultLocale;

/** Reactive accessor for the list of locales that have registered copy. */
export const useLocales = (): Accessor<Locale[]> => () => {
  registryVersion();
  return getRegisteredLocales();
};

/** Set the active locale and persist it. */
export const setLocale = (next: Locale): void => {
  setLocaleSignal(next);
  if (typeof window !== 'undefined') {
    localStorage.setItem(LOCALE_STORAGE_KEY, next);
  }
};

/** Set the active tenant override (`null` clears it) and persist it. */
export const setTenant = (next: Tenant | null): void => {
  setTenantSignal(next);
  if (typeof window === 'undefined') return;
  if (next === null) localStorage.removeItem(TENANT_STORAGE_KEY);
  else localStorage.setItem(TENANT_STORAGE_KEY, next);
};

/** Set the fallback locale (resolved when the active locale lacks a key). */
export const setDefaultLocale = (next: Locale): void => {
  setDefaultLocaleSignal(next);
};

/** Read the active locale once, non-reactively. */
export const getLocale = (): Locale => locale();

/** Read the active tenant once, non-reactively. */
export const getTenant = (): Tenant | null => tenant();

/** Read the fallback locale once, non-reactively. */
export const getDefaultLocale = (): Locale => defaultLocale();
