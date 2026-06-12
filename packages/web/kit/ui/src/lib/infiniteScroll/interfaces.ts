import type { Accessor } from 'solid-js';

/**
 * Scroll-backend mode.
 *
 * - `'virtual'`: uses @tanstack/solid-virtual. Only renders visible rows
 *   (windowing). Has a known cold-mount empty-body bug (virtualizer reads
 *   scrollHeight=0 at mount when the flex container resolves its height a frame
 *   late). Navigate-back (warm remount) heals it.
 *
 * - `'plain'`: renders ALL loaded rows as real DOM elements — no windowing.
 *   No virtualizer, no cold-empty quirk. Acceptable for datasets up to a few
 *   thousand rows; prefer `virtual` for very large sets once the cold-mount bug
 *   is resolved.
 *
 * Default is `'virtual'`. Pass `mode: 'plain'` to opt in to reliable rendering.
 */
export type InfiniteScrollMode = 'virtual' | 'plain';

export interface IInfiniteScrollOptions {
  /** Reactive count of total loaded items. */
  count: Accessor<number>;
  /**
   * Estimated item height in px. Used by the virtual backend for size
   * estimation and by the plain backend to set the `size` field on each item
   * (informational — does not affect DOM height in plain mode).
   * Default: 36.
   */
  itemHeight?: Accessor<number>;
  /** Number of items rendered outside the visible area (virtual only). Default: 5. */
  overscan?: Accessor<number>;
  /**
   * How many items before the end triggers `onLoadMore`. Default: 5.
   * Used by both backends.
   */
  threshold?: Accessor<number>;
  /** Callback fired when the user scrolls within `threshold` of the end. */
  onLoadMore?: () => void;
  /** Which backend to use. Default: `'virtual'`. See `InfiniteScrollMode`. */
  mode?: Accessor<InfiniteScrollMode>;
}

/**
 * Uniform row descriptor returned by both backends.
 *
 * - `index`: zero-based row index into the full data array.
 * - `size`: row height in px (itemHeight for plain; virtual's estimateSize for virtual).
 * - `start`: pixel offset from the top of the scroll area (0 for all plain rows;
 *   virtualizer's `start` for virtual rows).
 */
export interface IInfiniteScrollItem {
  index: number;
  size: number;
  start: number;
}

/**
 * Uniform contract returned by `createInfiniteScroll`.
 *
 * Both backends return the same shape so consumers render identically.
 *
 * Usage pattern:
 * ```tsx
 * const scroll = createInfiniteScroll(options);
 * <div ref={scroll.setScrollRef} style={{ height: '100%', overflow: 'auto' }}>
 *   <div style={{ height: `${scroll.paddingBefore()}px` }} />
 *   <For each={scroll.items()}>
 *     {(item) => <MyRow index={item.index} style={{ height: `${item.size}px` }} />}
 *   </For>
 *   <div style={{ height: `${scroll.paddingAfter()}px` }} />
 * </div>
 * ```
 */
export interface IInfiniteScrollContract {
  /** Attach to the scrollable container element. */
  setScrollRef: (el: HTMLElement) => void;
  /** Reactive list of row descriptors to render. */
  items: Accessor<IInfiniteScrollItem[]>;
  /** Height (px) of the spacer before the first rendered item. 0 in plain mode. */
  paddingBefore: Accessor<number>;
  /** Height (px) of the spacer after the last rendered item. 0 in plain mode. */
  paddingAfter: Accessor<number>;
  /**
   * Scroll to the row at `index` (virtual: virtualizer.scrollToIndex; plain: no-op).
   * Optional — consumers that need scrollToId call this.
   */
  scrollToIndex: (index: number, opts?: { align?: 'start' | 'center' | 'end' | 'auto' }) => void;
}
