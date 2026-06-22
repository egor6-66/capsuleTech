/**
 * EmitProvider — маршрутизирует `useEmit`-события в `eventSink` (remote channel)
 * вместо локальной HCA-шины, если задан.
 *
 * Используется в embedded-режиме: `createCapsuleApp(root, { eventSink: ctx.channel })`.
 * В standalone-режиме (`eventSink` не задан) — no-op обёртка, children проходят насквозь.
 *
 * АРХИТЕКТУРА:
 * - `EmitContext` определён в `engine/emit-context.ts` (нижний слой).
 *   Bootstrap импортирует его оттуда — граф: bootstrap → engine (верно).
 * - `useEmit()` читает `EmitContext` → если `IEmitSink` задан, emit
 *   идёт через `eventSink.send(eventName, payload)` (канал к хосту).
 * - Если `EmitContext` не содержит sink (standalone) → emit идёт через
 *   `ControllerContext` (текущее поведение, ControllerProxy dispatch).
 *
 * ВАЖНО: EmitProvider НЕ заменяет ControllerProxy dispatch — он добавляет
 * side-channel для embedded-режима. HCA-контроллеры продолжают обрабатывать
 * события локально; EmitProvider дополнительно пересылает их хосту.
 *
 * @module
 */

import type { JSX } from 'solid-js';

// EmitContext живёт в engine/ — bootstrap импортирует снизу (правильный граф).
// Реэкспортируем для consumer'ов /bootstrap subpath (IEmitSink, EmitContext, useEmitSink).
export type { IEmitSink } from '../engine/emit-context';
export { EmitContext, useEmitSink } from '../engine/emit-context';

import { EmitContext, type IEmitSink } from '../engine/emit-context';

interface IEmitProviderProps {
  /**
   * Remote-канал для embedded-режима. Если задан — useEmit-события
   * дополнительно пересылаются хосту через `eventSink.send`.
   * Если не задан — standalone-режим, no-op обёртка.
   *
   * Структурно: `{ send: (event: string, payload?: unknown) => void }`.
   * Совместимо с `IRemoteChannel` из @capsuletech/web-remote.
   */
  eventSink?: IEmitSink;
  children: JSX.Element;
}

/**
 * `EmitProvider` — контекстная обёртка для маршрутизации useEmit-событий.
 *
 * В standalone-режиме (`eventSink` не задан) прозрачная обёртка:
 * `EmitContext` не переопределяется, дочерние компоненты видят `undefined`.
 *
 * В embedded-режиме (`eventSink` задан) предоставляет `IEmitSink` через context:
 * emit-события идут через `eventSink.send` → хост.
 *
 * @example
 * // Standalone:
 * <EmitProvider>{children}</EmitProvider>
 *
 * @example
 * // Embedded (ctx.channel структурно совместим с IEmitSink):
 * <EmitProvider eventSink={ctx.channel}>{children}</EmitProvider>
 */
export function EmitProvider(props: IEmitProviderProps): JSX.Element {
  if (!props.eventSink) {
    // Standalone mode: transparent wrapper, no context override.
    return props.children as JSX.Element;
  }

  return <EmitContext.Provider value={props.eventSink}>{props.children}</EmitContext.Provider>;
}
