import type { JSX } from 'solid-js';

export type SkeletonVariant = 'text' | 'table' | 'list' | 'card' | 'map';

export interface ISkeletonProps {
  /** Visual variant of the skeleton placeholder. Defaults to 'text'. */
  variant?: SkeletonVariant;
  /**
   * Number of rows to render for 'text', 'table', and 'list' variants.
   * Defaults: text=3, table=8, list=5.
   */
  rows?: number;
  class?: string;
  style?: JSX.CSSProperties | string;
}
