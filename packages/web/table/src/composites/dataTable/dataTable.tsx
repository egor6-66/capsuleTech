import {
  createSolidTable,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  type PaginationState,
  type Row,
  type RowSelectionState,
  type SortingState,
  type Table as TanstackTable,
} from '@tanstack/solid-table';
import {
  createEffect,
  createSignal,
  For,
  mergeProps,
  Show,
  splitProps,
} from 'solid-js';
import { Button } from '@capsuletech/web-ui';
import { createInfiniteScroll } from '../../lib/infiniteScroll';
import { Table } from '../../primitives/table';
import type { DataTableTemplate, IDataTableInfiniteOptions, IDataTableProps } from './interfaces';

const DEFAULT_PAGE_SIZE = 10;
const DEFAULT_ITEM_HEIGHT = 36;
const DEFAULT_OVERSCAN = 5;
const DEFAULT_THRESHOLD = 5;

function resolveInfiniteOptions(
  infinite: boolean | IDataTableInfiniteOptions,
): Required<IDataTableInfiniteOptions> {
  const base = typeof infinite === 'object' ? infinite : {};
  return {
    itemHeight: base.itemHeight ?? DEFAULT_ITEM_HEIGHT,
    overscan: base.overscan ?? DEFAULT_OVERSCAN,
    threshold: base.threshold ?? DEFAULT_THRESHOLD,
    mode: base.mode ?? 'virtual',
  };
}

function EmptyState(props: { message?: string | import('solid-js').JSX.Element }) {
  return (
    <div class="flex h-24 items-center justify-center text-sm text-muted-foreground">
      <Show when={props.message !== undefined} fallback={<span>No results.</span>}>
        {props.message}
      </Show>
    </div>
  );
}

/**
 * Tailwind-классы для ячейки таблицы. Фиксируют high-priority три инварианта:
 *  - `whitespace-nowrap` — текст не переносится в несколько строк (фикс height row'а).
 *  - `overflow-hidden text-ellipsis` — длинный текст обрезается с `…`.
 *  - `align-middle` — вертикальное центрирование (важно когда row имеет explicit height).
 * Применяется и к `<th>`, и к `<td>` (см. TableHeaders + ...TableBody).
 */
const CELL_CLAMP_CLS = 'whitespace-nowrap overflow-hidden text-ellipsis';

// Shared header rendering — used in both standard and infinite modes
function TableHeaders<TRow>(props: {
  table: TanstackTable<TRow>;
  sorting: boolean;
  style?: import('solid-js').JSX.CSSProperties;
}) {
  return (
    <Table.Header style={props.style}>
      <For each={props.table.getHeaderGroups()}>
        {(headerGroup) => (
          <Table.Row>
            <For each={headerGroup.headers}>
              {(header) => (
                <Table.Head
                  class={[
                    CELL_CLAMP_CLS,
                    props.sorting && header.column.getCanSort() ? 'cursor-pointer select-none' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  onClick={
                    props.sorting && header.column.getCanSort()
                      ? header.column.getToggleSortingHandler()
                      : undefined
                  }
                >
                  <Show when={!header.isPlaceholder}>
                    <span class="inline-flex items-center gap-1">
                      {flexRender(header.column.columnDef.header, header.getContext())}
                      <Show when={props.sorting && header.column.getCanSort()}>
                        {header.column.getIsSorted() === 'asc'
                          ? ' ↑'
                          : header.column.getIsSorted() === 'desc'
                            ? ' ↓'
                            : ' ↕'}
                      </Show>
                    </span>
                  </Show>
                </Table.Head>
              )}
            </For>
          </Table.Row>
        )}
      </For>
    </Table.Header>
  );
}

/**
 * Props for data-row components inside the table bodies.
 *
 * `meta` and `payload` are the per-row HCA target descriptors produced by
 * `itemMeta` / `itemPayload` factories on IDataTableProps. They are forwarded
 * to the `onRowClick` / `onRowSelect` escape-hatch callbacks and collected by
 * DataTableController for useEmit proводки.
 *
 * `active` is a reactive accessor (not a plain boolean) so that when external
 * state changes the highlight re-computes inside DataRow's own reactive scope
 * without forcing the parent `<For>` to re-run for the other rows.
 */
interface IDataRowProps<TRow> {
  row: Row<TRow>;
  selection: boolean;
  itemHeight?: number;
  meta?: { tags: string[]; [k: string]: unknown };
  payload?: Record<string, unknown>;
  hasMeta: boolean;
  /** Reactive accessor — true when this row is the externally-active row. */
  active?: () => boolean;
  /** Stable row id for scrollToId — placed as data-row-id attribute. */
  rowId?: string | number;
  /** Escape-hatch row-click callback forwarded from IDataTableProps. */
  onRowClick?: (target: { meta?: { tags: string[]; [k: string]: unknown }; payload?: Record<string, unknown> }) => void;
}

/**
 * Inner data-row component.
 *
 * `onRowClick` is an escape-hatch callback forwarded from IDataTableProps — it is
 * called directly when the row is clicked, carrying `{ meta, payload }`. This path
 * is used both in standalone mode and as the underlying trigger for DataTableController's
 * useEmit proводки (the controller wraps onRowClick and calls emit after it).
 *
 * Note: `meta` and `payload` are NOT spread onto the DOM element. They are only
 * consumed inside this component and forwarded via `onRowClick`.
 */
function DataRow<TRow>(props: IDataRowProps<TRow>) {
  const [local, _rest] = splitProps(props, [
    'row',
    'selection',
    'itemHeight',
    'hasMeta',
    'active',
    'rowId',
    'meta',
    'payload',
    'onRowClick',
  ]);

  const handleClick = () => {
    if (local.onRowClick) {
      local.onRowClick({ meta: local.meta, payload: local.payload });
    }
  };

  return (
    <Table.Row
      data-state={local.selection && local.row.getIsSelected() ? 'selected' : undefined}
      data-active={local.active?.() ? 'true' : undefined}
      data-row-id={local.rowId !== undefined ? String(local.rowId) : undefined}
      style={local.itemHeight ? { height: `${local.itemHeight}px` } : undefined}
      classList={{
        'cursor-pointer': local.hasMeta,
        'bg-primary/20': !!local.active?.(),
      }}
      onClick={local.onRowClick ? handleClick : undefined}
    >
      <For each={local.row.getVisibleCells()}>
        {(cell) => (
          <Table.Cell class={CELL_CLAMP_CLS}>
            {flexRender(cell.column.columnDef.cell, cell.getContext())}
          </Table.Cell>
        )}
      </For>
    </Table.Row>
  );
}

function StandardTableBody<TRow>(props: {
  rows: Row<TRow>[];
  selection: boolean;
  itemHeight?: number;
  itemMeta?: (row: TRow) => { tags: string[]; [k: string]: unknown };
  itemPayload?: (row: TRow) => Record<string, unknown>;
  isRowActive?: (row: TRow) => boolean;
  getRowId?: (row: TRow) => string | number;
  onRowClick?: (target: { meta?: { tags: string[]; [k: string]: unknown }; payload?: Record<string, unknown> }) => void;
}) {
  return (
    <Table.Body>
      <For each={props.rows}>
        {(row) => {
          const meta = props.itemMeta ? props.itemMeta(row.original) : undefined;
          const payload = props.itemPayload ? props.itemPayload(row.original) : undefined;
          // Wrap the predicate in a stable getter so DataRow's classList
          // re-evaluates reactively when the external signal changes,
          // without causing the <For> loop to re-run for unrelated rows.
          const active = props.isRowActive ? () => props.isRowActive!(row.original) : undefined;
          const rowId = props.getRowId
            ? props.getRowId(row.original)
            : ((row.original as Record<string, unknown>).id as string | number | undefined);
          return (
            <DataRow
              row={row}
              selection={props.selection}
              hasMeta={!!meta}
              meta={meta}
              payload={payload}
              active={active}
              rowId={rowId}
              onRowClick={props.onRowClick}
            />
          );
        }}
      </For>
    </Table.Body>
  );
}

/**
 * Infinite-scroll table body backed by `createInfiniteScroll`.
 *
 * Renders using the uniform IInfiniteScrollContract — the same JSX tree
 * regardless of whether the active backend is `virtual` or `plain`.
 *
 * Layout:
 *  - Outer div: scroll container (h-full overflow-auto), ref'd via setScrollRef.
 *  - Inner table: table-fixed min-w-max.
 *  - Headers: sticky top-0 z-1.
 *  - Body: spacer-padding pattern (top spacer + virtual/plain rows + bottom spacer).
 *    paddingBefore/paddingAfter are 0 in plain mode.
 *
 * scrollToId:
 *  - virtual backend: scrollToIndex via the contract.
 *  - plain backend: DOM scrollIntoView via data-row-id attribute (same as standard mode).
 */
function InfiniteTable<TRow>(props: {
  table: TanstackTable<TRow>;
  sorting: boolean;
  selection: boolean;
  infinite: boolean | IDataTableInfiniteOptions;
  onLoadMore?: () => void;
  itemMeta?: (row: TRow) => { tags: string[]; [k: string]: unknown };
  itemPayload?: (row: TRow) => Record<string, unknown>;
  isRowActive?: (row: TRow) => boolean;
  scrollToId?: string | number;
  getRowId?: (row: TRow) => string | number;
  onRowClick?: (target: { meta?: { tags: string[]; [k: string]: unknown }; payload?: Record<string, unknown> }) => void;
}) {
  const opts = resolveInfiniteOptions(props.infinite);
  const isPlain = opts.mode === 'plain';

  // Reference to the scroll container — used for plain-mode scrollToId.
  let scrollContainerEl: HTMLDivElement | undefined;

  const scroll = createInfiniteScroll({
    count: () => props.table.getRowModel().rows.length,
    itemHeight: () => opts.itemHeight,
    overscan: () => opts.overscan,
    threshold: () => opts.threshold,
    onLoadMore: props.onLoadMore,
    mode: () => opts.mode,
  });

  const rows = () => props.table.getRowModel().rows;

  // Scroll to the row matching scrollToId when the prop changes.
  // virtual: scrollToIndex via the hook contract.
  // plain: DOM scrollIntoView via data-row-id (same as standard mode).
  createEffect(() => {
    const target = props.scrollToId;
    if (target === undefined || target === null) return;

    const allRows = rows();
    const idx = allRows.findIndex((r) => {
      const id = props.getRowId
        ? props.getRowId(r.original)
        : ((r.original as Record<string, unknown>).id as string | number | undefined);
      return id === target;
    });
    if (idx === -1) return;

    if (isPlain) {
      // Plain mode: use data-row-id DOM attribute + scrollIntoView
      const el = scrollContainerEl ?? document.body;
      const rowEl = el.querySelector<HTMLTableRowElement>(`tr[data-row-id="${String(target)}"]`);
      rowEl?.scrollIntoView({ block: 'center' });
    } else {
      scroll.scrollToIndex(idx, { align: 'center' });
    }
  });

  return (
    <div
      ref={(el) => {
        scrollContainerEl = el;
        scroll.setScrollRef(el);
      }}
      class="h-full overflow-auto scrollbar-hover"
    >
      <Table class="table-fixed min-w-max">
        <TableHeaders
          table={props.table}
          sorting={props.sorting}
          style={{ position: 'sticky', top: '0', 'z-index': '1', background: 'var(--background)' }}
        />

        <Table.Body>
          {/* Top spacer — 0 in plain mode */}
          <Show when={scroll.paddingBefore() > 0}>
            <tr style={{ height: `${scroll.paddingBefore()}px` }} />
          </Show>

          <For each={scroll.items()}>
            {(item) => {
              const row = () => rows()[item.index];
              const meta = () => (props.itemMeta ? props.itemMeta(row().original) : undefined);
              const payload = () =>
                props.itemPayload ? props.itemPayload(row().original) : undefined;
              // Reactive getter so the highlight tracks external signal changes
              // without re-running the <For> loop for other rows.
              const active = props.isRowActive
                ? () => props.isRowActive!(row().original)
                : undefined;
              const rowId = props.getRowId
                ? props.getRowId(row().original)
                : ((row().original as Record<string, unknown>).id as string | number | undefined);
              return (
                <DataRow
                  row={row()}
                  selection={props.selection}
                  itemHeight={item.size}
                  hasMeta={!!props.itemMeta}
                  meta={meta()}
                  payload={payload()}
                  active={active}
                  rowId={rowId}
                  onRowClick={props.onRowClick}
                />
              );
            }}
          </For>

          {/* Bottom spacer — 0 in plain mode */}
          <Show when={scroll.paddingAfter() > 0}>
            <tr style={{ height: `${scroll.paddingAfter()}px` }} />
          </Show>
        </Table.Body>
      </Table>
    </div>
  );
}

function DataTableComponent<TRow>(rawProps: IDataTableProps<TRow>) {
  const props = mergeProps(
    { sorting: false, pagination: false, selection: false, filtering: false } as const,
    rawProps,
  );
  const [local] = splitProps(props, [
    'data',
    'columns',
    'sorting',
    'pagination',
    'infinite',
    'onLoadMore',
    'itemMeta',
    'itemPayload',
    'isRowActive',
    'scrollToId',
    'getRowId',
    'selection',
    'filtering',
    'emptyMessage',
    'toolbar',
    'class',
    'onRowClick',
    'onRowSelect',
  ]);

  // --- feature signals ---

  const [sortingState, setSortingState] = createSignal<SortingState>([]);
  const [rowSelectionState, setRowSelectionState] = createSignal<RowSelectionState>({});

  const isInfinite = () => !!local.infinite;

  const resolvedPageSize = () => {
    if (!local.pagination) return DEFAULT_PAGE_SIZE;
    if (typeof local.pagination === 'object') return local.pagination.pageSize ?? DEFAULT_PAGE_SIZE;
    return DEFAULT_PAGE_SIZE;
  };

  const [paginationState, setPaginationState] = createSignal<PaginationState>({
    pageIndex: 0,
    pageSize: resolvedPageSize(),
  });

  // --- table instance ---

  const table = createSolidTable<TRow>({
    get data() {
      return local.data;
    },
    get columns() {
      // Cast: IColumn<TRow> is structurally compatible with ColumnDef<TRow>.
      return local.columns as Parameters<typeof createSolidTable<TRow>>[0]['columns'];
    },
    getCoreRowModel: getCoreRowModel(),

    // sorting
    ...(local.sorting && {
      onSortingChange: setSortingState,
      getSortedRowModel: getSortedRowModel(),
    }),

    // pagination — skip when infinite scroll is enabled
    ...(local.pagination &&
      !local.infinite && {
        onPaginationChange: setPaginationState,
        getPaginationRowModel: getPaginationRowModel(),
      }),

    // selection
    ...(local.selection && {
      onRowSelectionChange: setRowSelectionState,
      enableRowSelection: true,
    }),

    // filtering
    ...(local.filtering && {
      getFilteredRowModel: getFilteredRowModel(),
    }),

    state: {
      get sorting() {
        return sortingState();
      },
      get pagination() {
        return paginationState();
      },
      get rowSelection() {
        return rowSelectionState();
      },
    },
  });

  const isEmpty = () => local.data.length === 0;

  // Ref for the standard (non-virtual) table wrapper — used by scrollToId effect.
  let standardTableRef: HTMLDivElement | undefined;

  // Standard-mode scrollToId: when scrollToId changes, find the row by data-row-id
  // and call scrollIntoView({ block: 'nearest' }).
  createEffect(() => {
    if (isInfinite()) return; // InfiniteTable handles this internally
    const target = local.scrollToId;
    if (target === undefined || target === null) return;
    if (!standardTableRef) return;
    const rowEl = standardTableRef.querySelector<HTMLTableRowElement>(
      `tr[data-row-id="${String(target)}"]`,
    );
    rowEl?.scrollIntoView({ block: 'center' });
  });

  // Корневой контейнер — `h-full flex flex-col`. Toolbar/pagination — auto-height,
  // table-секция — `flex-1 min-h-0` (растягивается по родителю + min-h-0 нужен,
  // чтобы внутренний `h-full overflow-auto` InfiniteTable получил реальную
  // высоту, а не схлопнулся в content height).
  return (
    <div class={`flex h-full min-h-0 flex-col ${local.class ?? ''}`}>
      <Show when={local.toolbar !== undefined}>
        <div class="mb-component">{local.toolbar}</div>
      </Show>

      <div class="min-h-0 flex-1">
        <Show when={!isEmpty()} fallback={<EmptyState message={local.emptyMessage} />}>
          <Show
            when={isInfinite()}
            fallback={
              // --- Standard (non-virtual) render ---
              <div ref={standardTableRef}>
                <Table>
                  <TableHeaders table={table} sorting={!!local.sorting} />
                  <StandardTableBody
                    rows={table.getRowModel().rows}
                    selection={!!local.selection}
                    itemMeta={local.itemMeta}
                    itemPayload={local.itemPayload}
                    isRowActive={local.isRowActive}
                    getRowId={local.getRowId}
                    onRowClick={local.onRowClick}
                  />
                </Table>
              </div>
            }
          >
            <InfiniteTable
              table={table}
              sorting={!!local.sorting}
              selection={!!local.selection}
              infinite={local.infinite!}
              onLoadMore={local.onLoadMore}
              itemMeta={local.itemMeta}
              itemPayload={local.itemPayload}
              isRowActive={local.isRowActive}
              scrollToId={local.scrollToId}
              getRowId={local.getRowId}
              onRowClick={local.onRowClick}
            />
          </Show>
        </Show>
      </div>

      {/* Pagination controls (only when infinite is NOT enabled) */}
      <Show when={local.pagination && !local.infinite}>
        <div class="mt-component flex items-center justify-between text-sm">
          <span class="text-muted-foreground">
            Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
          </span>
          <div class="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={!table.getCanPreviousPage()}
              onClick={() => table.previousPage()}
            >
              Previous
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={!table.getCanNextPage()}
              onClick={() => table.nextPage()}
            >
              Next
            </Button>
          </div>
        </div>
      </Show>
    </div>
  );
}

/**
 * DataTable — row-generic composite with TanStack Table + optional virtual/plain
 * infinite scroll.
 *
 * Carries compile-time-only phantom `__tpl?: DataTableTemplate` for Shape HKT
 * row-type inference (ADR 036). No runtime value is assigned — the marker is
 * read only from .d.ts by codegen and Shape's type machinery.
 *
 * Form (as per matrixController.tsx `__events` pattern):
 *   export const DataTable: ((props: IDataTableProps<any>) => JSX.Element) & {
 *     readonly __tpl?: DataTableTemplate;
 *   } = DataTableComponent;
 */
export const DataTable: (<TRow>(props: IDataTableProps<TRow>) => import('solid-js').JSX.Element) & {
  readonly __tpl?: DataTableTemplate;
} = DataTableComponent;
