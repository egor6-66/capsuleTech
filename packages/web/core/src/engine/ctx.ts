import type { IBridge } from '@capsuletech/web-state';
import { createContext, useContext } from 'solid-js';

/**
 * Controller-proxy facade: имена методов → async-handlers, плюс системные поля.
 * Тип отражает Proxy-таргет из `engine/controller-proxy.ts`. Method-сигнатуры
 * у user-controller'ов динамические (schema-driven), поэтому index-signature
 * остаётся `any` — без него Proxy-based dispatch не типизируется без массивов
 * generic-параметров на каждый Controller.
 *
 * Для teardown — используй `schema.onDispose` (см. `IDefineStateSchema`).
 */
export interface IControllerHandle {
  /** Реактивный bridge — exposed как удобный alias внутри handlers. */
  store: IBridge;
  /** Schema-defined methods: `controller.<name>(target, context)`. */
  [methodName: string]: any;
}

/**
 * Контекст HCA-runtime'а, общий для UiProxy + Controller-tree. `state` — это
 * реактивный snapshot из `useMachine` (НЕ сам StateMachine — это распространённая
 * путаница; до P2 #4 типизировалось как `AnyStateMachine`, что было неверно).
 * Generic `T` сохраняем для совместимости — кастится через `useCtx<TSnapshot>()`.
 */
export interface ICtx<T = any> {
  state: T;
  store: IBridge;
  controller: IControllerHandle;
  /** У root-Controller'а родителя нет — потому optional. */
  parent?: ICtx;
}

export const Context = createContext<ICtx>();

export const useCtx = <T = any>() => useContext(Context) as ICtx<T>;

/**
 * Фабрика типизированного хука для пакетных потребителей.
 *
 * Использование (в пакете, например `@capsuletech/web-ui-creator`):
 * ```ts
 * import { createUseCtx } from '@capsuletech/web-core';
 * import type { IEditorCtx } from './types';
 *
 * // Создаём типизированный хук один раз — экспортируем из пакета:
 * export const useEditor = createUseCtx<IEditorCtx>();
 *
 * // В компонентах (рендерящихся внутри EditorController):
 * const ctx = useEditor();
 * ctx.store.ctx; // → IEditorCtx, без каста
 * ```
 *
 * Это сознательное решение: `IBridge.ctx` типизируется как `TCtx` через
 * runtime-доступ `store.ctx` (который Bridge читает из `state.context`).
 * `createUseCtx` — единственная «точка правды» для типизации контекста в пакете.
 *
 * Не требует изменений в web-core при появлении нового пакета — каждый пакет
 * создаёт свой хук самостоятельно поверх этой фабрики.
 */
export const createUseCtx =
  <TCtx = any>() =>
  () =>
    useContext(Context) as ICtx<TCtx>;
