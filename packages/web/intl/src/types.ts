/**
 * Public type contracts for `@capsuletech/web-intl`.
 *
 * The package is the content-side mirror of `@capsuletech/web-style`:
 * web-style resolves *appearance* (CSS theme bundles) by an active theme
 * signal; web-intl resolves *copy* (text bundles) by an active locale/tenant
 * signal. Both are headless module-level singletons — visible switcher
 * widgets live in `@capsuletech/web-ui` to avoid a dependency cycle.
 */

/** BCP-47-ish locale tag, e.g. `'en'`, `'ru'`, `'en-GB'`. Opaque string. */
export type Locale = string;

/** Tenant / customer id used to override base copy per client, e.g. `'acme'`. */
export type Tenant = string;

/**
 * Flat copy dictionary: dot-path key → resolved string.
 *
 * Keys are stable identifiers (`'login.title'`, `'user.email.label'`), never
 * the rendered text itself — the text is what swaps across locales/tenants.
 */
export type Dictionary = Record<string, string>;

/** A dictionary tagged with the locale (and optional tenant) it belongs to. */
export interface ICopyBundle {
  locale: Locale;
  tenant?: Tenant;
  dict: Dictionary;
}

/** Reactive copy resolver: `(key, fallback?) => string`. */
export type CopyResolver = (key: string, fallback?: string) => string;
