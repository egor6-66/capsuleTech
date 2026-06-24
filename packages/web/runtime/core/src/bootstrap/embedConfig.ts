/**
 * embedConfig — реактивный config-store + override-merge для embed-режима (ADR 059 Phase 1).
 *
 * База — `defineAppConfig` приложения (`IAppConfig` из `capsule.app.ts`). Host шлёт
 * override-патч через `__capsule_remote_config__`; он мержится в store по правилам D4:
 *
 *  - **per-key shallow, host wins** — патч заменяет top-level ключ целиком (shallow,
 *    без deep-merge вложенных объектов); отсутствующий у хоста ключ → остаётся app-дефолт.
 *  - **schema-фильтр на приёме** — ключи не из `APP_CONFIG_KEYS` молча отбрасываются
 *    (хост может не знать, кого встраивает).
 *  - **реактивно** — повторные патчи в рантайме ре-мержат store штатной solid-реактивностью;
 *    `createEffect(() => config.X)` реагирует.
 *
 * Merge — единственный источник override = postMessage-handshake (ADR 059, вариант A2).
 *
 * @module
 */

import { createStore } from 'solid-js/store';
import { APP_CONFIG_KEYS, type IAppConfig } from '../app-config';

const ALLOWED_KEYS = new Set<string>(APP_CONFIG_KEYS);

/**
 * Оставляет в патче только ключи из схемы `IAppConfig` (`APP_CONFIG_KEYS`).
 * Неизвестные ключи отбрасываются. Pure — не мутирует вход.
 */
export const filterOverride = (patch: Record<string, unknown>): Partial<IAppConfig> => {
  const out: Record<string, unknown> = {};
  for (const key of Object.keys(patch)) {
    if (ALLOWED_KEYS.has(key)) out[key] = patch[key];
  }
  return out as Partial<IAppConfig>;
};

/**
 * Pure-merge: `base ⊕ filtered(patch)` (per-key shallow, host wins).
 * Не мутирует `base`. Используется и тестами, и `createConfigStore`.
 */
export const mergeConfigOverride = (
  base: IAppConfig,
  patch: Record<string, unknown>,
): IAppConfig => ({ ...base, ...filterOverride(patch) });

export interface IConfigStore {
  /**
   * Реактивный merged-config (`base ⊕ overrides`). Чтение `config.X` отслеживается
   * Solid — потребитель реагирует на host-override автоматически.
   */
  config: IAppConfig;
  /**
   * Применить host-override патч (per-key shallow, host wins, schema-filtered).
   * Пустой/полностью-отфильтрованный патч — no-op (store не трогается).
   */
  applyOverride: (patch: Record<string, unknown>) => void;
}

/**
 * Создаёт реактивный config-store с базой `base` и аппликатором host-патчей.
 */
export const createConfigStore = (base: IAppConfig): IConfigStore => {
  const [config, setConfig] = createStore<IAppConfig>({ ...base });

  const applyOverride = (patch: Record<string, unknown>): void => {
    const filtered = filterOverride(patch);
    if (Object.keys(filtered).length === 0) return;
    // Функциональный setter: возвращаем merged-объект → Solid мержит top-level
    // ключи реактивно (неизменённые ссылки не триггерят подписчиков).
    setConfig((prev) => ({ ...prev, ...filtered }));
  };

  return { config, applyOverride };
};
