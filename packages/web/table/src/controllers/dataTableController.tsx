/**
 * DataTableController — прозрачная emit-проводка событий строк таблицы (ADR 032).
 *
 * Tier 2 connected block: обёртка над DataTable, которая рендерится ВНУТРИ
 * родительского HCA-контекста и транслирует row-события (клик, выбор) через
 * `useEmit` в HCA event-pipeline.
 *
 * Принцип (точно как MatrixController):
 * - НЕ создаёт собственный Controller-scope / store / Context.Provider.
 * - Слот-контент DataTable видит РОДИТЕЛЬСКИЙ HCA-контекст без затенения.
 * - `useEmit()` нацелен на ближайший существующий Controller/Feature аппа.
 *
 * Архитектурный поток:
 *   Features.Incidents → <Tables.DataTable itemMeta={...} itemPayload={...} />
 *     row click → DataTableController → useEmit → emit('onRowClick', { meta, payload })
 *       → ctx.controller.onRowClick → Features.Incidents (или auto-next() наверх)
 *
 * Standalone guard:
 *   Если DataTable рендерится вне любого Controller/Feature, useEmit() бросит.
 *   Защита через useCtx(): контекста нет → emit не вызывается, таблица работает
 *   как pure-UI (без HCA-проводки).
 *
 * Escape-hatch:
 *   onRowClick / onRowDblClick / onRowSelect, переданные напрямую в props, вызываются ВСЕГДА —
 *   независимо от наличия HCA-контекста.
 *
 * Phantom-поле `__events?: IDataTableEvents` позволяет:
 *   `Feature<EventsOf<typeof Tables.DataTable>>` → handler получает типизированный
 *   target без per-handler аннотации.
 *
 * Пример app-DX:
 * ```tsx
 * const ShowIncidents = Feature<Tables.DataTable.Events>((services) => ({
 *   context: { selectedId: null as string | null },
 *   onRowClick: ({ target }) => {
 *     // target.payload?.id — плоский ITarget, без вложенности
 *     services.store.update({ selectedId: target.payload?.id as string });
 *   },
 *   onRowDblClick: ({ target }) => {
 *     services.store.update({ detailId: target.payload?.id as string });
 *   },
 * }));
 * // <Features.ShowIncidents>
 * //   <Tables.DataTable
 * //     data={data()}
 * //     columns={columns}
 * //     itemMeta={(row) => ({ tags: ['incident', 'row'] })}
 * //     itemPayload={(row) => ({ id: row.id })}
 * //   />
 * // </Features.ShowIncidents>
 * ```
 */

import { useCtx, useEmit } from '@capsuletech/web-core';
import { splitProps } from 'solid-js';
import { DataTable } from '../composites/dataTable';
import type { DataTableTemplate, IDataTableProps } from '../composites/dataTable/interfaces';
import type { IDataTableEvents } from './interfaces';

// Re-export types для потребителей /controllers
export type { IDataTableEvents, IDataTableRowTarget } from './interfaces';

// ---------------------------------------------------------------------------
// DataTableControllerComponent — прозрачная проводка row-событий, без Context.
// ---------------------------------------------------------------------------

function DataTableControllerComponent<TRow>(props: IDataTableProps<TRow>) {
  // useCtx() не бросает — просто undefined если нет Context.
  const ctx = useCtx();
  // useEmit() вызываем только если контекст есть, иначе таблица работает
  // как pure-UI (без emit).
  const emit = ctx ? useEmit() : undefined;

  const [local, rest] = splitProps(props, ['onRowClick', 'onRowDblClick', 'onRowSelect']);

  // target от raw DataTable уже является Partial<ITarget>: { meta?, payload? }.
  // Эмитируем плоско — app-Feature ловит target.meta / target.payload напрямую,
  // без дополнительной вложенности (канон ITarget, аналог UiProxy-событий).

  const handleRowClick = (target: IDataTableEvents['onRowClick']) => {
    local.onRowClick?.(target);
    emit?.('onRowClick', target);
  };

  const handleRowDblClick = (target: IDataTableEvents['onRowDblClick']) => {
    local.onRowDblClick?.(target);
    emit?.('onRowDblClick', target);
  };

  const handleRowSelect = (target: IDataTableEvents['onRowSelect']) => {
    local.onRowSelect?.(target);
    emit?.('onRowSelect', target);
  };

  return (
    <DataTable
      {...rest}
      onRowClick={handleRowClick}
      onRowDblClick={handleRowDblClick}
      onRowSelect={handleRowSelect}
    />
  );
}

/**
 * Tables.DataTable — прозрачная emit-проводка поверх raw DataTable.
 *
 * НЕ создаёт Controller-scope: слот-контент видит родительский HCA-контекст.
 * Несёт phantom `__events?: IDataTableEvents` для `EventsOf<typeof Tables.DataTable>`.
 * Регистрируется в capsule.ts вместо raw DataTable.
 */
export const DataTableController: (<TRow>(props: IDataTableProps<TRow>) => any) & {
  readonly __tpl?: DataTableTemplate;
  readonly __events?: IDataTableEvents;
} = DataTableControllerComponent;

// Namespace `Tables.DataTable.Events` генерится codegen аппа из phantom-маркера __events.
