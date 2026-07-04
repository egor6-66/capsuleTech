import type { VariantProps } from 'class-variance-authority';
import type { Component, JSX } from 'solid-js';
import type { FlexJustify } from '../layout/flex/interfaces';
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
  item?: never;
  variant?: VariantProps<typeof listVariants>['variant'];
  orientation?: VariantProps<typeof listVariants>['orientation'];
  class?: string;
  style?: JSX.CSSProperties | string;
}

/**
 * Batch mode: pass `data` array + `item` descriptor (ADR 036 §3).
 *
 * ```tsx
 * <List data={rows} item={{ use: NavItem, props: (it) => ({ label: it.label }) }} />
 * ```
 *
 * `item.use` — per-item template component (был `itemAs` / `as`).
 * `item.props` — маппер данных → props; опционален (по умолчанию identity).
 * Requires `item.use`.
 */
export interface IListBatchProps<T> extends Omit<JSX.HTMLAttributes<HTMLDivElement>, 'children'> {
  /** Data array — rendered via <For> internally. */
  data: T[];
  /**
   * Batch descriptor: template component + optional props mapper (ADR 036 §3).
   * `item.use` is required for batch mode to activate.
   */
  item: {
    use: Component<any>;
    props?: (it: T) => Record<string, unknown>;
  };
  /**
   * When set, switches the `<ul>` to a responsive CSS Grid:
   * `grid-template-columns: repeat(auto-fit, minmax(<min>, 1fr))`.
   * Items wrap automatically by the list's own width.
   * Any valid CSS length is accepted (e.g. `'116px'`, `'8rem'`).
   * When omitted the existing flex layout (vertical/horizontal) is used unchanged.
   */
  min?: string;
  /**
   * Grid gap when `min` is set, or flex gap when `wrap` is set. Same
   * spacing-scale convention as `Flex`/`Grid` gap: `number` × 0.25rem
   * (`gap={1}` → `0.25rem`), or a raw CSS-length string (`'8px'`).
   * Defaults to `'0.5rem'`.
   */
  gap?: number | string;
  /**
   * Content-width wrap layout: `display: flex; flex-wrap: wrap` with each item
   * wrapped in a `shrink-0` `<li>` (no `1fr`-stretch — items keep their natural
   * width and wrap to new lines when the container narrows). For tag/chip/tile
   * grids where items have varying text length (contrast with `min`, which is
   * a CSS Grid that stretches every column to equal width).
   * Takes precedence over `min` when both are set.
   */
  wrap?: boolean;
  /**
   * `justify-content` for the `wrap` layout (row alignment — e.g. `'center'`
   * to centre a wrapped chip grid). No effect in `min` (grid) or plain-flex
   * mode. Same values as `Flex.justify`.
   */
  justify?: FlexJustify;
  /**
   * Container padding — spacing-scale, same convention as `Flex.p`/`px`/`py`
   * (`p={4}` → `padding: calc(var(--spacing) * 4)`). Applies in every batch
   * sub-mode (`min` grid / `wrap` flex / plain flex), layered on top of the
   * `variant` (`default`/`flush`) padding class.
   */
  p?: number;
  /** `padding-inline` (left+right) — spacing-scale. */
  px?: number;
  /** `padding-block` (top+bottom) — spacing-scale. */
  py?: number;
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
  item?: never;
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
