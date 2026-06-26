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

import { useContext } from 'solid-js';
import type { EmitFn, ITarget } from '../wrappers/interfaces';
import type { ICtx } from './ctx';
import { Context } from './ctx';
import { deriveName, getTargetData } from './derivation';
import { EmitContext } from './emit-context';

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
  // `base.meta` typed as `unknown` in getTargetData (generic `finalProps.meta?: unknown`)
  // but we passed Partial<ITarget>.meta which is `ITagMeta | undefined` — cast is safe.
  return {
    ...base,
    meta: base.meta as ITarget['meta'],
    dynamicMeta: base.dynamicMeta as ITarget['dynamicMeta'],
    ...(partial.key !== undefined ? { key: partial.key } : {}),
    ...(partial.modifiers !== undefined ? { modifiers: partial.modifiers } : {}),
    ...(partial.from !== undefined ? { from: partial.from } : {}),
  };
};

/**
 * Фабрика функции `emit` по готовому `ICtx`.
 *
 * Используется и внутри `logic-wrapper.tsx` (для инжекта в handler-API event + lifecycle),
 * и внутри `useEmit()` (для Views/render-scope).
 *
 * Замыкание читает `ctx.controller` и `ctx.store.ctx` **лениво** при каждом вызове —
 * тайминг не сломается даже если ctx создан до того как XState-машина успела
 * инициализировать store.ctx.
 *
 * Dispatch-путь идентичен UiProxy `buildEventBindings`:
 *   `ctx.controller[eventName](target, ctx.store.ctx)`
 *
 * @internal Не экспортируется из публичного barrel — только для use-emit.ts + logic-wrapper.tsx.
 */
export const createEmit =
  (ctx: ICtx): EmitFn =>
  (eventName: string, partial?: Partial<ITarget>): unknown => {
    const target = normalizeTarget(partial);
    return ctx.controller[eventName](target, ctx.store.ctx);
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
 * В embedded-режиме (когда `EmitProvider eventSink={...}` присутствует в дереве):
 * ПОСЛЕ локального dispatch дополнительно вызывает `sink.send(eventName, partial?.payload)` —
 * пересылает событие хосту. Локальный dispatch всегда идёт первым; sink-forward — параллельный
 * side-channel, не заменяет ControllerProxy. Возврат берётся от локального dispatch.
 *
 * В standalone-режиме (без EmitProvider или EmitProvider без eventSink): sink = undefined → no-op.
 *
 * @throws {Error} если вызван вне Controller/Feature-scope (нет ControllerContext).
 */
/**
 * Строит `emit`-функцию по готовому `ICtx`, читая sink из `EmitContext`.
 *
 * ⚠️ Вызывать ТОЛЬКО из render/hook-scope (читает `useContext(EmitContext)`).
 * Локальный dispatch первый; sink-forward (legacy embedded, ADR-053) — параллельный
 * fire-and-forget side-channel.
 */
const buildEmitFromCtx = (ctx: ICtx): EmitFn => {
  const sink = useContext(EmitContext);
  const localEmit = createEmit(ctx);

  return (eventName: string, partial?: Partial<ITarget>): unknown => {
    const result = localEmit(eventName, partial);
    sink?.send(eventName, partial?.payload);
    return result;
  };
};

export const useEmit = (): EmitFn => {
  const ctx = useContext(Context);

  if (!ctx) {
    throw new Error(
      '[useEmit] useEmit must be used inside a Controller or Feature scope. ' +
        'No ControllerContext found in the current component tree.',
    );
  }

  return buildEmitFromCtx(ctx);
};
