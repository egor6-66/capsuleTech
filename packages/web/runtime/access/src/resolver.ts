/**
 * Резолвер gate-оси + registry провайдеров.
 *
 * `can(cap)` реактивен, ЕСЛИ вызван в tracking-scope (JSX / createMemo) и
 * провайдеры читают реактивные источники (напр. `useAuth().role`).
 *
 * Слияние = ALL: любой запрет (`false`) → deny; иначе нужен ≥1 грант.
 * Все abstain → deny (capability никем не выдана). `mode: 'any'` — позже.
 */

import type { Capability, IAccessProvider } from './types';

const providers: IAccessProvider[] = [];

/** Регистрирует провайдер gate-оси (bootstrap аппа). */
export const registerAccessProvider = (provider: IAccessProvider): void => {
  providers.push(provider);
};

/** Test-only: сброс registry. */
export const __resetAccess = (): void => {
  providers.length = 0;
};

/** Резолвер capability. Реактивен в tracking-scope. */
export const can = (cap: Capability): boolean => {
  let granted = false;
  for (const p of providers) {
    const r = p.can(cap);
    if (r === undefined) continue;
    if (r === false) return false;
    granted = true;
  }
  return granted;
};

/** Хук-обёртка: `{ can }`. */
export const usePermissions = (): { can: (cap: Capability) => boolean } => ({ can });

/**
 * Фильтр списка по capability (для нав/меню/списков). Реактивен в reactive-scope.
 * Пункт без `can` виден всегда.
 */
export const filterAllowed = <T extends { can?: Capability }>(items: readonly T[]): T[] =>
  items.filter((i) => i.can == null || can(i.can));
