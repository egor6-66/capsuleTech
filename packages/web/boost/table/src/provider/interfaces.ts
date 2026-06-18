/**
 * DataTableProvider — контракт shared-данных таблицы.
 *
 * Назначение: одна сущность (Entity) → несколько саб-презентаций в разных
 * виджетах с общими данными. Каждый виджет может иметь свои локальные
 * данные (фильтры, выбранная строка), но общий массив строк и columns
 * берут из провайдера.
 *
 * Принцип (data-external — ADR 036 §1):
 *   Provider НЕ грузит данные. data/columns приходят сверху (Widget кормит
 *   store'ом через IDataTableProviderProps). Provider — только shared-bus.
 *
 * Под-компоненты:
 *   - DataTable.Provider  — обёртка (ставит Context)
 *   - DataTable.Body      — таблица без тулбара, читает shared data
 *   - DataTable.Toolbar   — тулбар (поиск / фильтры), читает shared data
 *   - DataTable.Pagination — кнопки пагинации, читает shared state
 *
 * Пример (одна сущность → два виджета):
 * ```tsx
 * // Widget A — шапка с поиском
 * <Tables.DataTable.Provider data={incidents()} columns={columns}>
 *   <Tables.DataTable.Toolbar>
 *     <Input ... />
 *   </Tables.DataTable.Toolbar>
 * </Tables.DataTable.Provider>
 *
 * // Widget B — само тело таблицы (ДРУГОЙ виджет, тот же Provider выше по дереву)
 * <Tables.DataTable.Body infinite={{ mode: 'plain' }} />
 * ```
 */

import type {
  IColumn,
  IDataTableInfiniteOptions,
  IDataTableProps,
} from '../composites/dataTable/interfaces';

/**
 * Данные, хранимые в shared Context провайдера.
 * Все поля — сигналы (читаются реактивно под-компонентами).
 */
export interface IDataTableSharedContext<TRow = unknown> {
  /** Массив строк. Реактивный — берётся из родительского store. */
  data: () => TRow[];
  /** Определения колонок. */
  columns: () => IColumn<TRow>[];
  /** Фабрика meta строки (из props провайдера). */
  itemMeta?: (row: TRow) => { tags: string[]; [k: string]: unknown };
  /** Фабрика payload строки (из props провайдера). */
  itemPayload?: (row: TRow) => Record<string, unknown>;
  /** Предикат активной строки (из props провайдера). */
  isRowActive?: (row: TRow) => boolean;
  /** Escape-hatch callback (из props провайдера). */
  onRowClick?: (target: {
    meta?: { tags: string[]; [k: string]: unknown };
    payload?: Record<string, unknown>;
  }) => void;
}

/**
 * Props для DataTableProvider (корневого компонента).
 * Принимает данные сверху (Widget кормит store'ом) и прокидывает в Context.
 */
export interface IDataTableProviderProps<TRow> {
  data: TRow[];
  columns: IColumn<TRow>[];
  itemMeta?: (row: TRow) => { tags: string[]; [k: string]: unknown };
  itemPayload?: (row: TRow) => Record<string, unknown>;
  isRowActive?: (row: TRow) => boolean;
  onRowClick?: (target: {
    meta?: { tags: string[]; [k: string]: unknown };
    payload?: Record<string, unknown>;
  }) => void;
  children: import('solid-js').JSX.Element;
}

/**
 * Props для DataTableBody — под-компонент, читает shared context.
 * Принимает только display-опции: sorting, pagination, infinite, etc.
 * data + columns — из Context.
 */
export type IDataTableBodyProps = Omit<
  IDataTableProps<unknown>,
  'data' | 'columns' | 'itemMeta' | 'itemPayload' | 'isRowActive' | 'onRowClick'
>;
