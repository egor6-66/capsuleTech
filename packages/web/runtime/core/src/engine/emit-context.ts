/**
 * EmitContext — Solid Context для маршрутизации useEmit в embedded-режиме.
 *
 * Вынесен в engine/ (а не в bootstrap/EmitProvider.tsx) чтобы граф зависимостей
 * оставался чистым: bootstrap → engine (нижний слой), а не engine → bootstrap
 * (что создавало бы обратную зависимость).
 *
 * `IEmitSink` и `EmitContext` определены здесь; `EmitProvider` (bootstrap/) импортирует
 * их отсюда и выставляет в публичный subpath `/bootstrap`.
 *
 * @module
 */

import { createContext, useContext } from 'solid-js';

/**
 * Минимальный контракт канала для embedded-режима.
 * Структурно совместим с `IRemoteChannel.send` из @capsuletech/web-remote
 * (duck typing, без import-зависимости → нет circular dep).
 */
export interface IEmitSink {
  /** Отправить событие хосту (fire-and-forget). */
  send: (event: string, payload?: unknown) => void;
}

/**
 * Context, несущий IEmitSink для embedded-режима.
 * Undefined = standalone (emit идёт локально через ControllerProxy).
 */
export const EmitContext = createContext<IEmitSink | undefined>(undefined);

/**
 * Hook для получения текущего emit-sink.
 * Возвращает `undefined` в standalone-режиме.
 *
 * @internal Используется в `use-emit.ts` для embedded-routing.
 */
export const useEmitSink = (): IEmitSink | undefined => useContext(EmitContext);
