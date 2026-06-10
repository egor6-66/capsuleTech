// @capsuletech/web-table — main barrel.
// Exports DataTable composite, Table primitives, lib hooks, and Provider.

// --- composites ---
export { DataTable, DataTableContract } from './composites/dataTable';
export type {
  ColumnDef,
  DataTableTemplate,
  IColumn,
  IDataTableInfiniteOptions,
  IDataTableProps,
} from './composites/dataTable';

// --- provider (super-shape / shared-data bus, ADR 036 §6) ---
export {
  DataTableProvider,
  DataTableBody,
  DataTableToolbar,
  DataTablePagination,
  useDataTableContext,
} from './provider';
export type {
  IDataTableSharedContext,
  IDataTableProviderProps,
  IDataTableBodyProps,
} from './provider';

// --- primitives ---
export { Table } from './primitives/table';
export type {
  ITableBodyProps,
  ITableCellProps,
  ITableHeaderProps,
  ITableHeadProps,
  ITableProps,
  ITableRowProps,
} from './primitives/table';

// --- lib ---
export { createInfiniteScroll } from './lib/infiniteScroll';
export type {
  IInfiniteScrollContract,
  IInfiniteScrollItem,
  IInfiniteScrollOptions,
  InfiniteScrollMode,
} from './lib/infiniteScroll';

export { createPagination } from './lib/pagination';
export type { IPaginationContract, IPaginationOptions } from './lib/pagination';
