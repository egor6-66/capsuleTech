/**
 * ApiBaseContext — база learn-BFF (ADR 055), расшаренная вниз от
 * `Learn.Provider` ко всем connected-блокам пакета (зеркало студийного
 * `CanvasNameContext`). Единственный источник апи-адреса для пакетных
 * data-слоёв (`library/api.ts` и будущие).
 *
 * Дефолт `''` — standalone-safe (относительный fetch, полезно для тестов
 * рендерящих блоки без обёртывающего Provider).
 */
import { createContext, useContext } from 'solid-js';

export const DEFAULT_API_BASE = '';

export const ApiBaseContext = createContext<string>(DEFAULT_API_BASE);

/** Читает apiBase из ближайшего `Learn.Provider`. */
export const useApiBase = (): string => useContext(ApiBaseContext);
