import type { VariantProps } from 'class-variance-authority';
import type { Component, JSX } from 'solid-js';
import type { listItemVariants, listVariants } from './variants';

export interface IListItemProps extends Omit<JSX.HTMLAttributes<HTMLDivElement>, 'children'> {
  variant?: VariantProps<typeof listItemVariants>['variant'];
  asChild?: boolean;
  children?: JSX.Element | ((props: any) => JSX.Element);
  class?: string;
  style?: JSX.CSSProperties | string;
}

/** Render-prop (classic) mode: items + children as render function. */
export interface IListRenderProps<T> extends Omit<JSX.HTMLAttributes<HTMLDivElement>, 'children'> {
  items: T[];
  children: (item: T, index: () => number) => JSX.Element;
  /** Batch mode props must be absent in render-prop mode. */
  data?: never;
  as?: never;
  itemAs?: never;
  itemProps?: never;
  variant?: VariantProps<typeof listVariants>['variant'];
  orientation?: VariantProps<typeof listVariants>['orientation'];
  class?: string;
  style?: JSX.CSSProperties | string;
}

/**
 * Batch mode: pass `data` array + item template component.
 *
 * **Canonical (Shape-compatible):** use `itemAs` for the per-item template,
 * mirroring `Group`'s contract so `Shape({ as: ui.List, itemAs: Tpl })` works.
 *
 * **Deprecated alias:** `as` is accepted for backwards-compat with pre-existing
 * batch stories/tests. Prefer `itemAs` in new code.
 *
 * At least one of `itemAs` / `as` is required.
 */
export interface IListBatchProps<T> extends Omit<JSX.HTMLAttributes<HTMLDivElement>, 'children'> {
  /** Data array — rendered via <For> internally. */
  data: T[];
  /**
   * Per-item template component (canonical, Shape-compatible).
   * Receives spread of `itemProps(item)`.
   */
  itemAs?: Component<any>;
  /**
   * @deprecated Use `itemAs` instead. Kept for back-compat.
   * Per-item template component. `itemAs` takes precedence when both are set.
   */
  as?: Component<any>;
  /** Maps each item to props for the template. Defaults to identity (item as-is). */
  itemProps?: (item: T) => Record<string, unknown>;
  /**
   * When set, switches the `<ul>` to a responsive CSS Grid:
   * `grid-template-columns: repeat(auto-fit, minmax(<min>, 1fr))`.
   * Items wrap automatically by the list's own width.
   * Any valid CSS length is accepted (e.g. `'116px'`, `'8rem'`).
   * When omitted the existing flex layout (vertical/horizontal) is used unchanged.
   */
  min?: string;
  /**
   * Grid gap when `min` is set. Accepts any valid CSS length (e.g. `'0.5rem'`, `'8px'`).
   * Defaults to `'0.5rem'` when `min` is provided.
   */
  gap?: string;
  /** items/children must be absent in batch mode. */
  items?: never;
  children?: never;
  variant?: VariantProps<typeof listVariants>['variant'];
  orientation?: VariantProps<typeof listVariants>['orientation'];
  class?: string;
  style?: JSX.CSSProperties | string;
}

/** Semantic (no data) mode: plain children, no iteration. */
export interface IListSemanticProps extends JSX.HTMLAttributes<HTMLUListElement> {
  data?: never;
  as?: never;
  itemAs?: never;
  itemProps?: never;
  items?: never;
  variant?: VariantProps<typeof listVariants>['variant'];
  orientation?: VariantProps<typeof listVariants>['orientation'];
  class?: string;
  style?: JSX.CSSProperties | string;
}

/** Union of all three list modes. */
export type IListProps<T = unknown> = IListRenderProps<T> | IListBatchProps<T> | IListSemanticProps;

export interface IVirtualListProps<T> extends Omit<JSX.HTMLAttributes<HTMLDivElement>, 'children'> {
  items: T[];
  children: (item: T, index: () => number) => JSX.Element;
  estimateSize?: number;
  variant?: VariantProps<typeof listVariants>['variant'];
  orientation?: VariantProps<typeof listVariants>['orientation'];
  class?: string;
  style?: JSX.CSSProperties | string;
}
