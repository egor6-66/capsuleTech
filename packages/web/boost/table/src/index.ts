// @capsuletech/boost-table — main barrel.
// Exports DataTable composite, Table primitives, lib hooks, and Provider.

export type {
  ColumnDef,
  DataTableTemplate,
  IColumn,
  IDataTableInfiniteOptions,
  IDataTableProps,
} from './composites/dataTable';
// --- composites ---
export { DataTable, DataTableContract } from './composites/dataTable';
export type {
  IInfiniteScrollContract,
  IInfiniteScrollItem,
  IInfiniteScrollOptions,
  InfiniteScrollMode,
} from './lib/infiniteScroll';
// --- lib ---
export { createInfiniteScroll } from './lib/infiniteScroll';
export type { IPaginationContract, IPaginationOptions } from './lib/pagination';
export { createPagination } from './lib/pagination';
export type {
  ITableBodyProps,
  ITableCellProps,
  ITableHeaderProps,
  ITableHeadProps,
  ITableProps,
  ITableRowProps,
} from './primitives/table';
// --- primitives ---
export { Table } from './primitives/table';
export type {
  IDataTableBodyProps,
  IDataTableProviderProps,
  IDataTableSharedContext,
} from './provider';
// --- provider (super-shape / shared-data bus, ADR 036 §6) ---
export {
  DataTableBody,
  DataTablePagination,
  DataTableProvider,
  DataTableToolbar,
  useDataTableContext,
} from './provider';
