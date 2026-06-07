import type { Accessor } from 'solid-js';

export interface IPaginationOptions {
  /** Reactive total item count. */
  count: Accessor<number>;
  /** Items per page. Default: 10. */
  pageSize?: Accessor<number>;
}

export interface IPaginationContract {
  /** Current zero-based page index. */
  pageIndex: Accessor<number>;
  /** Jump to a specific page (clamped to [0, pageCount-1]). */
  setPageIndex: (index: number) => void;
  /** Go to next page (no-op if already on last page). */
  next: () => void;
  /** Go to previous page (no-op if already on first page). */
  prev: () => void;
  /** Whether the previous page exists. */
  canPrev: Accessor<boolean>;
  /** Whether the next page exists. */
  canNext: Accessor<boolean>;
  /** Total number of pages (ceil(count / pageSize)). */
  pageCount: Accessor<number>;
  /**
   * Zero-based indices of items on the current page.
   * e.g. page 1 with pageSize 10 returns [10, 11, ..., 19] (clamped to count).
   */
  pageItems: Accessor<number[]>;
}
