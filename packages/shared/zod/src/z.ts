import type { JSX } from 'solid-js';
import type { ZodType } from 'zod';
import { z as zodRoot } from 'zod';

/**
 * Capsule-расширенный zod-namespace. Прокидывается в фабрики обёрток (Shape и др.)
 * первым/служебным аргументом — пользователь НЕ импортирует напрямую,
 * а получает через фабричный аргумент.
 *
 * В v1 добавлен один хелпер — `z.component()` для JSX-renderable полей.
 * По мере роста сюда попадут другие capsule-доменные валидаторы:
 *   - `z.tag()` для CapsuleTag из app-config'а;
 *   - `z.href()` для URL-паттернов;
 *   - `z.alias()` для алиасов;
 *   - и т.д.
 *
 * Реализация — shallow-copy через spread, а не `Object.create(zod)`:
 * Vite после `optimizeDeps` оборачивает zod в frozen ESM Module-namespace,
 * и присваивание `proxy.component` через прототипную цепочку ловит
 * `Cannot assign to property 'component' of [object Module]`. Spread даёт
 * обычный объект без frozen-прототипа, оригинальный модуль не мутируется.
 */
/**
 * Intersection сохраняет оригинальные generic-сигнатуры методов zodRoot без
 * маппинга. `interface extends Omit<typeof zodRoot, never>` применяло mapped
 * type к namespace'у модуля, что деградировало generic-методы:
 *   `array<T>(s:T): ZodArray<T>` → `array: (...) => ZodArray<any>`.
 * `typeof zodRoot & { component }` — чистый intersection, generics сохраняются.
 */
export type CapsuleZ = typeof zodRoot & {
  /** zod-схема для Solid-renderable значения (JSX.Element, function-component, string и т.п.). */
  component: () => ZodType<JSX.Element>;
};

const create = (): CapsuleZ => {
  const proxy = { ...zodRoot } as CapsuleZ;
  proxy.component = () => zodRoot.custom<JSX.Element>(() => true);
  return proxy;
};

export const z: CapsuleZ = create();

/**
 * Canonical global alias for auto-import (unplugin-auto-import).
 * Идентичен `z` по типу и значению — тот же CapsuleZ инстанс.
 * Используется в app-коде как глобал: `Zod.array(...)`, `Zod.object(...)`, `Zod.component()`.
 * `z` сохраняется как alias для фабрик (Entity, старые Shape) до их миграции.
 */
export const Zod: CapsuleZ = z;
