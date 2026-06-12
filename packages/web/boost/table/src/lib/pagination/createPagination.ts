import { createMemo, createSignal } from 'solid-js';

import type { IPaginationContract, IPaginationOptions } from './interfaces';

const DEFAULT_PAGE_SIZE = 10;

/**
 * Headless pagination hook.
 *
 * Manages zero-based page state and exposes stable navigation primitives.
 * The hook is purely stateful — it does not fetch data; callers slice their
 * data array using `pageItems()` or pass `pageIndex()` / `pageSize()` to
 * their server-side fetch.
 *
 * ```ts
 * const pg = createPagination({ count: () => data.length, pageSize: () => 20 });
 * // Render items on the current page:
 * const visibleItems = () => pg.pageItems().map(i => data[i]);
 * ```
 */
export function createPagination(opts: IPaginationOptions): IPaginationContract {
  const pageSize = () => opts.pageSize?.() ?? DEFAULT_PAGE_SIZE;

  const pageCount = createMemo(() => {
    const n = opts.count();
    const size = pageSize();
    if (size <= 0 || n <= 0) return 0;
    return Math.ceil(n / size);
  });

  const [pageIndex, setPageIndexRaw] = createSignal(0);

  const clamp = (idx: number) => Math.max(0, Math.min(idx, pageCount() - 1));

  const setPageIndex = (index: number) => {
    setPageIndexRaw(clamp(index));
  };

  const canPrev = createMemo(() => pageIndex() > 0);
  const canNext = createMemo(() => pageIndex() < pageCount() - 1);

  const next = () => {
    if (canNext()) setPageIndexRaw((i) => i + 1);
  };

  const prev = () => {
    if (canPrev()) setPageIndexRaw((i) => i - 1);
  };

  const pageItems = createMemo(() => {
    const size = pageSize();
    const idx = pageIndex();
    const n = opts.count();
    const start = idx * size;
    const end = Math.min(start + size, n);
    const result: number[] = [];
    for (let i = start; i < end; i++) result.push(i);
    return result;
  });

  return {
    pageIndex,
    setPageIndex,
    next,
    prev,
    canPrev,
    canNext,
    pageCount,
    pageItems,
  };
}
