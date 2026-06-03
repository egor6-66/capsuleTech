/**
 * `useEmit` — программный канал HCA-событий (ADR 032, фаза 1).
 *
 * Программный близнец DOM-dispatch'а UiProxy:
 *   UiProxy: meta-узел → DOM-событие → buildEventBindings → ctx.controller[name](target, ctx)
 *   useEmit: emit('onDrop', partial) → normalizeTarget(partial) → ctx.controller[name](target, ctx)
 *
 * Используется из:
 *  - package entry-points (`@capsuletech/web-dnd/controllers`, `@capsuletech/web-renderer/controllers`):
 *    meta-aware droppable/overlay сам зовёт emit, не требуя от app-кода escape-hatch.
 *  - low-level escape (`const emit = useEmit(); emit('onSelect', { payload })`) — полностью
 *    кастомные интеракции, которые не выражаются через DOM-событие + meta-prop.
 *
 * Намеренно экспортируется из публичного barrel (нарушение правила «engine/* не public»,
 * см. gotcha #9 в docs/_meta/web-core.md). Причина: это единственный способ дать внешним
 * пакетам (web-dnd, web-renderer, etc.) доступ к dispatch-механизму без дублирования
 * engine-логики или введения второго механизма. Контракт строго ограничен функцией `useEmit`
 * — остальное engine остаётся internal. Задокументировано в ADR 032.
 *
 * TODO (фазы 3-4 ADR 032): когда пакеты начнут экспортировать Controller через
 * `/controllers` subpath, тип `eventName` можно сузить до keyof handler'ов целевого
 * Controller'а через generic-параметр. Сейчас `string` достаточно — ControllerProxy
 * принимает любое имя, несовпадение просто уйдёт в `next()` автобаблинг.
 */

import type { ITarget } from '../wrappers/interfaces';
import { useContext } from 'solid-js';
import { Context } from './ctx';
import { deriveName, getTargetData } from './derivation';

/**
 * Нормализует `Partial<ITarget>` до полного `ITarget` с дефолтами.
 * Зеркалит сборку target в `buildEventBindings` (ui-proxy.tsx), но без DOM-события
 * (нет `currentTarget`, нет keyboard state) — только JSX/программные поля.
 *
 * Приоритеты:
 *  - `name`: deriveName из meta.tags, fallback на partial.name
 *  - `value`: partial.value (нет DOM-элемента для чтения)
 *  - `type`: partial.type (нет DOM-элемента)
 *  - `meta`, `payload`, `dynamicMeta`: из partial напрямую
 *  - `key`, `modifiers`: из partial (undefined если не передан)
 */
export const normalizeTarget = (partial: Partial<ITarget> = {}): ITarget => {
  // getTargetData строит target из (event, finalProps, derivedName).
  // Передаём undefined как event — нет DOM-узла, нет keyboard state.
  const derivedName = partial.meta ? deriveName(partial.meta) : undefined;
  const base = getTargetData(
    undefined,
    {
      name: partial.name,
      value: partial.value,
      meta: partial.meta,
      dynamicMeta: partial.dynamicMeta,
      payload: partial.payload,
    },
    derivedName,
  );

  // `from` не входит в `getTargetData` (это контракт ControllerProxy-level,
  // не UiProxy-level), поэтому мержим вручную.
  return {
    ...base,
    ...(partial.key !== undefined ? { key: partial.key } : {}),
    ...(partial.modifiers !== undefined ? { modifiers: partial.modifiers } : {}),
    ...(partial.from !== undefined ? { from: partial.from } : {}),
  };
};

/**
 * Возвращает функцию `emit`, которая программно диспатчит событие в ближайший
 * Controller/Feature по тому же пути, что UiProxy для DOM-событий:
 *
 *   `ctx.controller[eventName](normalizedTarget, ctx.store.ctx)`
 *
 * ControllerProxy резолвит `states[currentState][eventName]` → top-level → `next()` автобаблинг —
 * полностью идентично DOM-dispatch'у. Handler может быть async — возврат/Promise пробрасываются.
 *
 * @throws {Error} если вызван вне Controller/Feature-scope (нет ControllerContext).
 */
export const useEmit = (): ((eventName: string, target?: Partial<ITarget>) => unknown) => {
  const ctx = useContext(Context);

  if (!ctx) {
    throw new Error(
      '[useEmit] useEmit must be used inside a Controller or Feature scope. ' +
        'No ControllerContext found in the current component tree.',
    );
  }

  return (eventName: string, partial?: Partial<ITarget>): unknown => {
    const target = normalizeTarget(partial);
    // Dispatch-путь идентичен UiProxy buildEventBindings (строка 124 ui-proxy.tsx):
    //   safeCall(ctx.controller[name], data, ctx.store.ctx)
    // Здесь не оборачиваем в safeCall — пользователь может и должен ловить ошибки
    // на своём уровне. async-reject пробрасывается как есть (см. аналог в ControllerProxy).
    return ctx.controller[eventName](target, ctx.store.ctx);
  };
};
