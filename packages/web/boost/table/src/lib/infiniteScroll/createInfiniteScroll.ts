import { createVirtualizer } from '@tanstack/solid-virtual';
import { createEffect, createMemo } from 'solid-js';

import type {
  IInfiniteScrollContract,
  IInfiniteScrollItem,
  IInfiniteScrollOptions,
} from './interfaces';

const DEFAULT_ITEM_HEIGHT = 36;
const DEFAULT_OVERSCAN = 5;
const DEFAULT_THRESHOLD = 5;

// ---------------------------------------------------------------------------
// Virtual backend
// ---------------------------------------------------------------------------

function createVirtualBackend(opts: IInfiniteScrollOptions): IInfiniteScrollContract {
  let scrollEl: HTMLElement | undefined;

  const itemHeight = () => opts.itemHeight?.() ?? DEFAULT_ITEM_HEIGHT;
  const overscan = () => opts.overscan?.() ?? DEFAULT_OVERSCAN;
  const threshold = () => opts.threshold?.() ?? DEFAULT_THRESHOLD;

  const virtualizer = createVirtualizer({
    get count() {
      return opts.count();
    },
    getScrollElement: () => scrollEl ?? null,
    estimateSize: () => itemHeight(),
    get overscan() {
      return overscan();
    },
    // useAnimationFrameWithResizeObserver was trialled to address the flex-height
    // race where the scroll container resolves its height a frame late.
    // OUTCOME: ineffective — cold-empty still reproduced on 5/5 attempts.
    // Kept matching the original InfiniteTable behaviour; dropping it would be
    // a separate follow-up change.
    useAnimationFrameWithResizeObserver: true,
  });

  // Trigger onLoadMore when near the bottom
  createEffect(() => {
    if (!opts.onLoadMore) return;
    const virtualItems = virtualizer.getVirtualItems();
    if (virtualItems.length === 0) return;
    const lastIndex = virtualItems[virtualItems.length - 1]?.index ?? 0;
    if (lastIndex >= opts.count() - threshold()) {
      opts.onLoadMore();
    }
  });

  const items: () => IInfiniteScrollItem[] = () =>
    virtualizer.getVirtualItems().map((v) => ({
      index: v.index,
      size: v.size,
      start: v.start,
    }));

  const paddingBefore = (): number => {
    const v = virtualizer.getVirtualItems();
    return v[0]?.start ?? 0;
  };

  const paddingAfter = (): number => {
    const v = virtualizer.getVirtualItems();
    const lastEnd = v[v.length - 1]?.end ?? 0;
    return Math.max(0, virtualizer.getTotalSize() - lastEnd);
  };

  return {
    setScrollRef: (el) => {
      scrollEl = el;
    },
    items,
    paddingBefore,
    paddingAfter,
    scrollToIndex: (index, scrollOpts) => {
      virtualizer.scrollToIndex(index, scrollOpts);
    },
  };
}

// ---------------------------------------------------------------------------
// Plain backend
// ---------------------------------------------------------------------------

function createPlainBackend(opts: IInfiniteScrollOptions): IInfiniteScrollContract {
  let scrollEl: HTMLElement | undefined;

  const itemHeight = () => opts.itemHeight?.() ?? DEFAULT_ITEM_HEIGHT;
  const threshold = () => opts.threshold?.() ?? DEFAULT_THRESHOLD;

  // All indices — no windowing. Every loaded row is a real DOM element.
  const items: () => IInfiniteScrollItem[] = createMemo(() => {
    const h = itemHeight();
    const n = opts.count();
    const result: IInfiniteScrollItem[] = [];
    for (let i = 0; i < n; i++) {
      result.push({ index: i, size: h, start: i * h });
    }
    return result;
  });

  // Wire onLoadMore on scroll near the bottom (same threshold logic as virtual).
  const attachScrollHandler = (el: HTMLElement) => {
    if (!opts.onLoadMore) return;
    const handler = () => {
      const remaining = el.scrollHeight - el.scrollTop - el.clientHeight;
      const thresholdPx = threshold() * itemHeight();
      if (remaining <= thresholdPx) {
        opts.onLoadMore?.();
      }
    };
    el.addEventListener('scroll', handler, { passive: true });
    return () => el.removeEventListener('scroll', handler);
  };

  return {
    setScrollRef: (el) => {
      scrollEl = el;
      attachScrollHandler(el);
    },
    items,
    paddingBefore: () => 0,
    paddingAfter: () => 0,
    // plain mode: no virtualizer.
    // scrollToIndex is intentionally a no-op — callers that need scrollToId
    // should use the data-row-id + scrollIntoView DOM path instead.
    scrollToIndex: (_index, _opts) => {},
  };
}

// ---------------------------------------------------------------------------
// Public hook
// ---------------------------------------------------------------------------

/**
 * Headless hook for infinite-scroll rendering with swappable backends.
 *
 * Returns a uniform {@link IInfiniteScrollContract} regardless of which backend
 * is active. Consumers attach `setScrollRef` to their scroll container and
 * render `items()` between `paddingBefore()` / `paddingAfter()` spacers.
 *
 * **Backend selection** (read once at hook creation — mode is not reactive):
 * - `'virtual'` (default): @tanstack/solid-virtual windowed rendering. Fast
 *   for large datasets; has a known cold-mount empty-body bug where the
 *   virtualizer reads scrollHeight=0 at mount and renders 0 rows. Navigate-back
 *   (warm remount) heals it.
 * - `'plain'`: renders all loaded rows as real DOM elements. No virtualizer,
 *   no cold-empty quirk. Use this for reliable rendering now; switch to
 *   `'virtual'` once the cold-mount bug is fixed.
 *
 * Mode is evaluated once at creation. To switch modes, unmount and remount
 * the parent component (or key it).
 */
export function createInfiniteScroll(opts: IInfiniteScrollOptions): IInfiniteScrollContract {
  // Mode is read once at creation time. Reactive switching not supported
  // (would require tearing down the virtualizer, which Solid's ownership would
  // handle — but callers don't need dynamic switching; document this boundary).
  const mode = opts.mode?.() ?? 'virtual';

  if (mode === 'plain') {
    return createPlainBackend(opts);
  }
  return createVirtualBackend(opts);
}
