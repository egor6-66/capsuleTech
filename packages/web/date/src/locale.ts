import type { Locale } from 'date-fns';
import { enUS } from 'date-fns/locale';

/**
 * Active date-fns locale — a module-level singleton, mirroring how
 * `@capsuletech/web-style` holds the active theme and `@capsuletech/web-intl`
 * holds the active copy-locale.
 *
 * Defaults to `enUS` (a sensible fallback, not a business choice). Apps register
 * their locale once at bootstrap; every `formatDate` / `range` call then reads it.
 * Sync with `@capsuletech/web-intl` is a consumer concern — call `setDateLocale`
 * from wherever the app switches locale.
 */
let active: Locale = enUS;

/** Set the active date-fns locale used by `formatDate` and week-based ranges. */
export const setDateLocale = (locale: Locale): void => {
  active = locale;
};

/** Read the active date-fns locale. */
export const getDateLocale = (): Locale => active;
