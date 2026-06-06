import type { JSX } from 'solid-js';

/**
 * One field definition in PreviewCard — row-generic.
 *
 * Mirrors the accessor pattern from @tanstack/solid-table `ColumnDef` so that
 * consumers already familiar with DataTable feel at home.
 *
 * Canonical name is `IFieldDef<TRow>`; `IPreviewCardField` is kept as a
 * backward-compatible alias.
 */
export interface IFieldDef<TRow> {
  /**
   * Accessor key — must be a direct key of TRow.
   * If both `accessorFn` and `accessorKey` are provided, `accessorFn` wins.
   */
  accessorKey?: keyof TRow & string;

  /**
   * Custom value extractor from the row object.
   * Takes precedence over `accessorKey` when both are supplied.
   */
  accessorFn?: (row: TRow) => unknown;

  /**
   * Field label — rendered as muted small typography above the value.
   */
  header: string;

  /**
   * Custom cell renderer (e.g. formatters, links, badges).
   * When provided, replaces the default `<Typography>` value rendering.
   */
  cell?: (info: { getValue: () => unknown; row: TRow }) => JSX.Element;

  /**
   * Stable key used for the field in the `<For>` loop.
   * Derived automatically from `accessorKey` when absent.
   * Required when using `accessorFn` without `accessorKey`.
   */
  id?: string;
}

/** @deprecated Use `IFieldDef<TRow>` — backward-compatible alias. */
export type IPreviewCardField<TData> = IFieldDef<TData>;

export interface IPreviewCardProps<TRow> {
  /**
   * Single item to preview.
   * When `null` or `undefined`, `emptyMessage` is rendered instead of field rows.
   */
  data: TRow | undefined | null;

  /**
   * Ordered list of field definitions.
   * Fields are rendered in array order.
   */
  fields: IFieldDef<TRow>[];

  /**
   * Content shown when `data` is null/undefined.
   * Accepts a plain string or arbitrary JSX.
   * When omitted, an empty fragment is rendered (no visible empty state).
   */
  emptyMessage?: string | JSX.Element;

  /**
   * Extra class applied to the outer wrapper element.
   * The wrapper is a flex-col container.
   */
  class?: string;

  /**
   * When true, drop the card chrome (background, border, shadow) so the content
   * inherits the parent surface. Padding and the internal field layout are kept.
   * Default: false (full self-contained card).
   */
  flat?: boolean;
}

/**
 * HKT phantom marker for PreviewCard — carries row-type for Shape-level inference.
 *
 * `this['row']` is valid at top-level of an interface property (TS 5.x).
 * Shape (web-core) reads `MarkerOf<Ui.PreviewCard>` → applies `RowOf<schema>`
 * via `ApplyRow<M, R>` intersection — `fields` / `accessorFn` / `cell` get
 * typed per row automatically without manual annotations.
 *
 * NOTE: PreviewCard component export carries `readonly __tpl?: PreviewCardTemplate`
 * as a compile-time-only phantom. No runtime value is assigned.
 */
export interface PreviewCardTemplate {
  row: unknown;
  props: IPreviewCardProps<this['row']>;
}
