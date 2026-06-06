// @capsuletech/web-table — main barrel.
// Exports DataTable composite, Table primitives, and lib hooks.

// --- composites ---
export { DataTable } from './composites/dataTable';
export type {
  ColumnDef,
  DataTableTemplate,
  IColumn,
  IDataTableInfiniteOptions,
  IDataTableProps,
} from './composites/dataTable';

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
