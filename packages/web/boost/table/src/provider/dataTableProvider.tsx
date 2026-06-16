/**
 * DataTableProvider + под-компоненты — «super-shape» / shared-data bus (ADR 036 §6).
 *
 * Архитектурный паттерн:
 *   Одна сущность → несколько саб-презентаций в разных виджетах.
 *   Общие данные (data, columns, itemMeta, itemPayload, isRowActive, onRowClick)
 *   хранятся в Solid Context, под-компоненты читают их реактивно.
 *
 * Экспортируется в три точки:
 *   - `DataTableProvider`          (явный именованный компонент)
 *   - `DataTable.Provider`         (namespace-style через Object.assign)
 *   - `DataTable.Body`             (под-компонент тела таблицы)
 *   - `DataTable.Toolbar`          (под-компонент тулбара)
 *   - `DataTable.Pagination`       (под-компонент пагинации)
 *
 * Принцип «data-external» (ADR 036 §1):
 *   Provider НЕ грузит данные и НЕ имеет состояния. data приходит сверху
 *   через props (Widget кормит store'ом). Provider = чистый shared-bus.
 *
 * Standalone guard: под-компоненты (Body/Toolbar/Pagination) БЕЗОПАСНО
 * рендерятся вне Provider — возвращают null с console.warn (не бросают).
 *
 * Пример (одна сущность → два виджета):
 * ```tsx
 * // Widget A — шапка с поиском (корень провайдера)
 * <Tables.DataTable.Provider data={incidents()} columns={columns}>
 *   <Tables.DataTable.Toolbar>
 *     <Input value={filter()} onInput={(e) => setFilter(e.target.value)} />
 *   </Tables.DataTable.Toolbar>
 * </Tables.DataTable.Provider>
 *
 * // Widget B — тело таблицы (читает Context провайдера выше по дереву)
 * <Tables.DataTable.Body infinite={{ mode: 'plain' }} />
 * ```
 */

import type { JSX } from 'solid-js';
import { createContext, useContext } from 'solid-js';
import { DataTable } from '../composites/dataTable';
import type {
  IDataTableBodyProps,
  IDataTableProviderProps,
  IDataTableSharedContext,
} from './interfaces';

// ---------------------------------------------------------------------------
// Solid Context
// ---------------------------------------------------------------------------

const DataTableContext = createContext<IDataTableSharedContext | null>(null);

/**
 * useDataTableContext — читает shared Context провайдера.
 * Возвращает null если вне Provider (standalone guard).
 */
export function useDataTableContext(): IDataTableSharedContext | null {
  return useContext(DataTableContext);
}

// ---------------------------------------------------------------------------
// DataTableProvider — корневой компонент, ставит Context.
// ---------------------------------------------------------------------------

function DataTableProviderComponent<TRow>(props: IDataTableProviderProps<TRow>) {
  const ctx: IDataTableSharedContext<TRow> = {
    data: () => props.data,
    columns: () => props.columns,
    itemMeta: props.itemMeta,
    itemPayload: props.itemPayload,
    isRowActive: props.isRowActive,
    onRowClick: props.onRowClick,
  };

  return (
    <DataTableContext.Provider value={ctx as IDataTableSharedContext}>
      {props.children}
    </DataTableContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// DataTableBody — под-компонент тела таблицы.
// Читает data + columns + фабрики из Context, принимает только display-опции.
// ---------------------------------------------------------------------------

function DataTableBodyComponent(props: IDataTableBodyProps) {
  const ctx = useDataTableContext();
  if (!ctx) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn(
        '[web-table] DataTable.Body: нет DataTable.Provider выше по дереву. Рендер пропущен.',
      );
    }
    return null;
  }

  return (
    <DataTable
      data={ctx.data() as unknown[]}
      columns={ctx.columns()}
      itemMeta={ctx.itemMeta}
      itemPayload={ctx.itemPayload}
      isRowActive={ctx.isRowActive}
      onRowClick={ctx.onRowClick}
      {...props}
    />
  );
}

// ---------------------------------------------------------------------------
// DataTableToolbar — под-компонент тулбара.
// Хранит children (произвольный JSX — Input, кнопки и т.п.).
// ---------------------------------------------------------------------------

function DataTableToolbarComponent(props: { children: JSX.Element }) {
  const ctx = useDataTableContext();
  if (!ctx) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[web-table] DataTable.Toolbar: нет DataTable.Provider выше по дереву.');
    }
    return null;
  }

  return <div class="mb-component flex items-center gap-2">{props.children}</div>;
}

// ---------------------------------------------------------------------------
// DataTablePagination — под-компонент пагинации.
// Минимальная реализация; расширяется в будущих фазах.
// ---------------------------------------------------------------------------

function DataTablePaginationComponent(props: { class?: string }) {
  const ctx = useDataTableContext();
  if (!ctx) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[web-table] DataTable.Pagination: нет DataTable.Provider выше по дереву.');
    }
    return null;
  }

  // Pagination state — управляется через DataTable.Body (через props.pagination).
  // Этот компонент является placeholder'ом для будущего split pagination + body.
  return (
    <div class={`mt-component flex items-center justify-between text-sm ${props.class ?? ''}`}>
      {/* Pagination controls будут вынесены сюда в Phase 2 (split pagination) */}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Public exports — DataTable.Provider / DataTable.Body / DataTable.Toolbar /
// DataTable.Pagination (namespace-style).
// ---------------------------------------------------------------------------

export const DataTableProvider: <TRow>(props: IDataTableProviderProps<TRow>) => JSX.Element =
  DataTableProviderComponent;

export const DataTableBody: (props: IDataTableBodyProps) => JSX.Element = DataTableBodyComponent;

export const DataTableToolbar: (props: { children: JSX.Element }) => JSX.Element =
  DataTableToolbarComponent;

export const DataTablePagination: (props: { class?: string }) => JSX.Element =
  DataTablePaginationComponent;
