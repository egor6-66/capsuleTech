import type { ColumnDef } from '@tanstack/solid-table';
import type { JSX } from 'solid-js';

import type { InfiniteScrollMode } from '../../lib/infiniteScroll';

export type { ColumnDef } from '@tanstack/solid-table';

/**
 * Typed column definition wrapper.
 *
 * Tightens `accessorKey` from `string` to `keyof TRow & string` so that TS
 * catches mismatched keys at the call-site. All other `ColumnDef` fields are
 * inherited unchanged.
 *
 * Note: TanStack's own `ColumnDef<TRow>` types `accessorKey` as `string`
 * (they use a separate generic for the value), so this wrapper adds the
 * constraint we want without changing runtime behaviour.
 */
export type IColumn<TRow> = Omit<ColumnDef<TRow>, 'accessorKey'> & {
  accessorKey?: keyof TRow & string;
};

export interface IDataTableInfiniteOptions {
  /** Estimated row height in px. Default: 36. */
  itemHeight?: number;
  /** Number of rows rendered outside the visible area (virtual only). Default: 5. */
  overscan?: number;
  /**
   * How many rows before the end of the list triggers `onLoadMore`.
   * Only used when `onLoadMore` is also provided. Default: 5.
   */
  threshold?: number;
  /**
   * Which infinite-scroll backend to use.
   *
   * - `'virtual'` (default): @tanstack/solid-virtual windowed rendering.
   *   Fast for large datasets but has a confirmed cold-mount empty-body bug:
   *   the virtualizer reads scrollHeight=0 at mount when the flex container
   *   resolves its height a frame late. Navigate-back heals it.
   * - `'plain'`: renders ALL loaded rows as real DOM elements. No virtualizer,
   *   no cold-empty quirk. Use this for reliable rendering now.
   *
   * Default: `'virtual'`.
   */
  mode?: InfiniteScrollMode;
}

/**
 * HKT phantom marker for DataTable — carries row-type for Shape-level inference.
 *
 * `this['row']` is valid at top-level of an interface property (TS 5.x).
 * Shape (web-core) reads `MarkerOf<Tables.DataTable>` → applies `RowOf<schema>`
 * via `ApplyRow<M, R>` intersection — columns / callbacks get typed per row.
 *
 * NOTE: DataTable component export carries `readonly __tpl?: DataTableTemplate`
 * as a compile-time-only phantom. No runtime value assigned.
 */
export interface DataTableTemplate {
  row: unknown;
  props: IDataTableProps<this['row']>;
}

export interface IDataTableProps<TRow> {
  data: TRow[];
  /**
   * Column definitions. Prefer `IColumn<TRow>[]` over raw `ColumnDef<TRow>[]`
   * for tight `accessorKey` inference.
   */
  columns: IColumn<TRow>[];

  /**
   * Enable click-to-sort on column headers.
   * Shows ↑ / ↓ / ↕ direction indicators.
   */
  sorting?: boolean;

  /**
   * @deprecated Use `infinite` instead for large datasets.
   * Enable row pagination (click Prev/Next).
   * Pass `true` for default pageSize (10) or an object to configure it.
   */
  pagination?: boolean | { pageSize?: number };

  /**
   * Enable infinite-scroll mode.
   * Pass `true` for all defaults or an object to tune behaviour.
   *
   * When enabled:
   * - `pagination` is ignored.
   * - All rows are passed to TanStack Table (no getPaginationRowModel).
   * - Rows are rendered via the selected backend (see `mode`).
   *
   * Defaults: `{ itemHeight: 36, overscan: 5, threshold: 5, mode: 'virtual' }`.
   *
   * **Note on `mode`:** The default `'virtual'` backend has a confirmed
   * cold-mount empty-body bug. Pass `mode: 'plain'` for reliable rendering
   * (all rows rendered as real DOM elements, no virtualizer).
   */
  infinite?: boolean | IDataTableInfiniteOptions;

  /**
   * Called when the user scrolls within `threshold` rows of the end.
   * Only fires when `infinite` is enabled. Use for server-side pagination /
   * "load more" pattern.
   */
  onLoadMore?: () => void;

  /**
   * Per-row HCA target meta factory. Called with each row's original data.
   * The returned object is forwarded to `onRowClick` / `onRowSelect` callbacks
   * as `target.meta`, and collected by DataTableController for useEmit proводки
   * into the parent Controller/Feature.
   *
   * Example:
   *   itemMeta={(row) => ({ tags: ['user', 'row'], id: row.id })}
   *
   * When provided, `cursor-pointer` is added to the row for UX affordance.
   */
  itemMeta?: (row: TRow) => { tags: string[]; [k: string]: unknown };

  /**
   * Predicate marking the externally-active row (e.g. the HCA-selected item).
   * The matching row receives a highlight background (`bg-primary/20`) and a
   * `data-active="true"` attribute. Distinct from `selection` (TanStack's
   * checkbox row model). Called reactively per row — the predicate may close
   * over a reactive signal (e.g. `store.ctx.data.selected`) so the highlight
   * moves without re-rendering the full table.
   *
   * Example:
   *   isRowActive={(row) => row.id === selectedId()}
   */
  isRowActive?: (row: TRow) => boolean;

  /**
   * Scroll the table to the row whose id matches `scrollToId`. Reactive —
   * whenever this value changes and resolves to a row, DataTable scrolls that
   * row into view.
   *
   * - **infinite mode:** calls `virtualizer.scrollToIndex(index, { align: 'center' })`.
   * - **standard mode:** calls `scrollIntoView({ block: 'center' })` on the
   *   row DOM element (identified by `data-row-id` attribute).
   *
   * Row matching uses `getRowId` when provided; falls back to
   * `(row.original as any).id`.
   */
  scrollToId?: string | number;

  /**
   * Custom id extractor used by `scrollToId` to find the target row.
   * When absent, falls back to `(row.original as any).id`.
   *
   * Example:
   *   getRowId={(row) => row.uuid}
   */
  getRowId?: (row: TRow) => string | number;

  /**
   * Per-row HCA payload factory. Called with each row's original data.
   * The returned object is passed as the `payload` prop on the row component
   * alongside `meta` so the events-wrapper can include it with emitted events.
   *
   * Example:
   *   itemPayload={(row) => ({ userId: row.id, userName: row.name })}
   */
  itemPayload?: (row: TRow) => Record<string, unknown>;

  /**
   * Direct row-click callback (escape-hatch, non-HCA).
   *
   * Called on every row click regardless of HCA context.
   * In HCA apps prefer routing through Features via `onRowClick` emit
   * (DataTableController / Tables.DataTable wrapping). Use this prop only
   * when the table is rendered standalone without a Controller/Feature ancestor.
   *
   * Receives the same target object that DataTableController emits:
   *   `{ meta?: { tags, ...}, payload?: Record<string,unknown> }`
   */
  onRowClick?: (target: { meta?: { tags: string[]; [k: string]: unknown }; payload?: Record<string, unknown> }) => void;

  /**
   * Direct row double-click callback (escape-hatch, non-HCA).
   *
   * Called on every row dblclick regardless of HCA context.
   * In HCA apps use `onRowDblClick` emit via DataTableController (Tables.DataTable)
   * for opening detail cards etc. Use this prop only for standalone use.
   *
   * Same target shape as `onRowClick`.
   */
  onRowDblClick?: (target: { meta?: { tags: string[]; [k: string]: unknown }; payload?: Record<string, unknown> }) => void;

  /**
   * Direct row-select callback (escape-hatch, non-HCA).
   *
   * Called when a row is selected (checkbox / programmatic).
   * Same semantics as `onRowClick` — escape-hatch for standalone use.
   */
  onRowSelect?: (target: { meta?: { tags: string[]; [k: string]: unknown }; payload?: Record<string, unknown> }) => void;

  /**
   * Enable a leading checkbox column + row selection state.
   * Consumer is responsible for adding a select ColumnDef if they need
   * custom rendering; this flag wires the selection row model.
   */
  selection?: boolean;

  /**
   * Enable client-side global text filtering.
   * Pair with the `toolbar` slot to render a filter <Input>.
   */
  filtering?: boolean;

  /**
   * Content rendered when `data.length === 0`.
   * Defaults to a simple centred "No results." message.
   */
  emptyMessage?: string | JSX.Element;

  /**
   * Slot rendered above the table (e.g. a search Input).
   * Receives no special wiring — consumer controls the signal.
   */
  toolbar?: JSX.Element;

  /** Extra class on the outer wrapper div. */
  class?: string;
}
