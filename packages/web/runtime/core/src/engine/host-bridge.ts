/**
 * host-bridge — host→app inbound-канал для embedded-режима (ADR 060 Phase 3 / D1).
 *
 * Парный к `EmitContext` (app→host outbound). Несёт per-instance `IHostInbound`,
 * через который bootstrap инжектит валидированные host→app события в КОРНЕВУЮ
 * HCA-шину приложения, не требуя embedding-кода в аппе:
 *
 *   host postMessage → createCapsuleApp listener → validateEvent(contract,'in',…)
 *     → IHostInbound.emit(name, payload) → root LogicWrapper dispatcher
 *     → createEmit(rootCtx)(name, { payload }) → ControllerProxy (штатный HCA-dispatch)
 *
 * Per-instance (через Context, НЕ module-singleton) — несколько `createCapsuleApp`
 * на одной странице не делят канал. Standalone (нет provider'а) → `undefined` →
 * корневой LogicWrapper не подписывается, нулевой overhead.
 *
 * Вынесен в engine/ (нижний слой): bootstrap → engine, logic-wrapper → engine —
 * без обратных рёбер графа.
 *
 * @module
 */

import { createContext, useContext } from 'solid-js';

/**
 * Per-instance host→app канал. Корневой LogicWrapper регистрирует свой dispatcher;
 * bootstrap-listener зовёт `emit` на валидном host-событии — оно уходит во все
 * зарегистрированные корни (обычно один — `__root`).
 */
export interface IHostInbound {
  /**
   * Регистрирует dispatcher корневого Controller/Feature (parent === undefined).
   * Возвращает unregister (вызывается в `onCleanup` LogicWrapper'а).
   */
  register: (dispatch: (eventName: string, payload?: unknown) => void) => () => void;
  /** Диспатчит host→app событие во все зарегистрированные корни (fire-and-forget). */
  emit: (eventName: string, payload?: unknown) => void;
}

/**
 * App→host forward-gate для КОРНЕВОГО Feature/Controller (ADR 060 D1).
 *
 * Канон app→host: форвардить хосту события, ДОШЕДШИЕ ДО КОРНЯ аппа (HCA-бабблинг =
 * граница «внутреннее/наружу»). Когда имя события ∈ `contract.out`, корневой dispatch
 * форвардит его хосту ВМЕСТО выполнения локального хендлера — host становится
 * обработчиком (forward-instead-of-handle). `useEmit` (пакетный хук) тут НЕ источник.
 *
 * Один и тот же app-код: standalone обрабатывает событие сам; embedded — оно уходит
 * хосту, локальный хендлер корня пропущен.
 */
export interface IRootForward {
  /** true если имя ∈ `contract.out` — тогда событие форвардится, локальный хендлер корня пропускается. */
  shouldForward: (eventName: string) => boolean;
  /** Форвард хосту: envelope + out-валидация (см. `buildContractGatedSink`). */
  forward: (eventName: string, payload?: unknown) => void;
}

/** Per-instance forward-gate корня. `undefined` = standalone / нет contract → мост off. */
export const RootForwardContext = createContext<IRootForward | undefined>(undefined);

/**
 * Hook для корневого LogicWrapper'а. `undefined` в standalone / без contract.
 *
 * @internal Используется в `logic-wrapper.tsx` для root forward-gate.
 */
export const useRootForward = (): IRootForward | undefined => useContext(RootForwardContext);

/** Context, несущий `IHostInbound`. `undefined` = standalone / мост выключен. */
export const HostInboundContext = createContext<IHostInbound | undefined>(undefined);

/**
 * Hook для корневого LogicWrapper'а. `undefined` в standalone-режиме.
 *
 * @internal Используется в `logic-wrapper.tsx` для root-подписки.
 */
export const useHostInbound = (): IHostInbound | undefined => useContext(HostInboundContext);

/**
 * Фабрика канала — bootstrap создаёт один на каждый embedded app-instance.
 * Набор dispatcher'ов (а не один ref) — корректно работает, даже если приложение
 * имеет несколько top-level логик; `emit` бродкастит в каждый (незаявленный
 * eventName безопасно уходит в `next()` no-op у корня).
 */
export const createHostInbound = (): IHostInbound => {
  const dispatchers = new Set<(eventName: string, payload?: unknown) => void>();
  return {
    register: (dispatch) => {
      dispatchers.add(dispatch);
      return () => {
        dispatchers.delete(dispatch);
      };
    },
    emit: (eventName, payload) => {
      for (const dispatch of dispatchers) dispatch(eventName, payload);
    },
  };
};
