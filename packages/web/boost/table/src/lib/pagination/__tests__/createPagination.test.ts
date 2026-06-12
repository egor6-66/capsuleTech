/**
 * createPagination — pure-logic unit tests.
 *
 * All logic is reactive-signal based but the computation is deterministic.
 * Tests run in default vitest environment (node / solid createRoot).
 *
 * Covers:
 *   - pageCount math (ceil, edge cases: 0 items, exact multiple, +1)
 *   - pageItems indices (start, end, clamp at count)
 *   - next / prev / canNext / canPrev navigation
 *   - setPageIndex clamping
 *   - reactive count / pageSize changes
 */
import { createRoot, createSignal } from 'solid-js';
import { describe, expect, it } from 'vitest';

import { createPagination } from '../createPagination';

// ---------------------------------------------------------------------------
// pageCount
// ---------------------------------------------------------------------------

describe('createPagination — pageCount', () => {
  it('returns ceil(count / pageSize)', () => {
    createRoot((dispose) => {
      const pg = createPagination({ count: () => 25, pageSize: () => 10 });
      expect(pg.pageCount()).toBe(3); // ceil(25/10)
      dispose();
    });
  });

  it('returns 1 when count equals pageSize exactly', () => {
    createRoot((dispose) => {
      const pg = createPagination({ count: () => 10, pageSize: () => 10 });
      expect(pg.pageCount()).toBe(1);
      dispose();
    });
  });

  it('returns 1 when count is 1', () => {
    createRoot((dispose) => {
      const pg = createPagination({ count: () => 1, pageSize: () => 10 });
      expect(pg.pageCount()).toBe(1);
      dispose();
    });
  });

  it('returns 0 when count is 0', () => {
    createRoot((dispose) => {
      const pg = createPagination({ count: () => 0, pageSize: () => 10 });
      expect(pg.pageCount()).toBe(0);
      dispose();
    });
  });

  it('uses default pageSize of 10 when pageSize is omitted', () => {
    createRoot((dispose) => {
      const pg = createPagination({ count: () => 35 });
      expect(pg.pageCount()).toBe(4); // ceil(35/10)
      dispose();
    });
  });

  it('updates reactively when count signal changes', () => {
    createRoot((dispose) => {
      const [count, setCount] = createSignal(10);
      const pg = createPagination({ count, pageSize: () => 10 });

      expect(pg.pageCount()).toBe(1);
      setCount(25);
      expect(pg.pageCount()).toBe(3);

      dispose();
    });
  });
});

// ---------------------------------------------------------------------------
// pageItems
// ---------------------------------------------------------------------------

describe('createPagination — pageItems', () => {
  it('returns indices 0..pageSize-1 on the first page', () => {
    createRoot((dispose) => {
      const pg = createPagination({ count: () => 25, pageSize: () => 10 });
      expect(pg.pageItems()).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
      dispose();
    });
  });

  it('returns indices for the second page', () => {
    createRoot((dispose) => {
      const pg = createPagination({ count: () => 25, pageSize: () => 10 });
      pg.next(); // page 1
      expect(pg.pageItems()).toEqual([10, 11, 12, 13, 14, 15, 16, 17, 18, 19]);
      dispose();
    });
  });

  it('clamps last page items to count (partial page)', () => {
    createRoot((dispose) => {
      const pg = createPagination({ count: () => 25, pageSize: () => 10 });
      pg.next();
      pg.next(); // page 2
      expect(pg.pageItems()).toEqual([20, 21, 22, 23, 24]); // only 5 items
      dispose();
    });
  });

  it('returns empty array when count is 0', () => {
    createRoot((dispose) => {
      const pg = createPagination({ count: () => 0, pageSize: () => 10 });
      expect(pg.pageItems()).toEqual([]);
      dispose();
    });
  });

  it('returns all items on a single page when count <= pageSize', () => {
    createRoot((dispose) => {
      const pg = createPagination({ count: () => 5, pageSize: () => 10 });
      expect(pg.pageItems()).toEqual([0, 1, 2, 3, 4]);
      dispose();
    });
  });
});

// ---------------------------------------------------------------------------
// Navigation — next / prev / canNext / canPrev
// ---------------------------------------------------------------------------

describe('createPagination — navigation', () => {
  it('starts on page 0', () => {
    createRoot((dispose) => {
      const pg = createPagination({ count: () => 30, pageSize: () => 10 });
      expect(pg.pageIndex()).toBe(0);
      dispose();
    });
  });

  it('canPrev is false on first page', () => {
    createRoot((dispose) => {
      const pg = createPagination({ count: () => 30, pageSize: () => 10 });
      expect(pg.canPrev()).toBe(false);
      dispose();
    });
  });

  it('canNext is true when there are more pages', () => {
    createRoot((dispose) => {
      const pg = createPagination({ count: () => 30, pageSize: () => 10 });
      expect(pg.canNext()).toBe(true);
      dispose();
    });
  });

  it('next() increments pageIndex', () => {
    createRoot((dispose) => {
      const pg = createPagination({ count: () => 30, pageSize: () => 10 });
      pg.next();
      expect(pg.pageIndex()).toBe(1);
      dispose();
    });
  });

  it('prev() decrements pageIndex', () => {
    createRoot((dispose) => {
      const pg = createPagination({ count: () => 30, pageSize: () => 10 });
      pg.next();
      pg.next();
      pg.prev();
      expect(pg.pageIndex()).toBe(1);
      dispose();
    });
  });

  it('next() is a no-op on the last page', () => {
    createRoot((dispose) => {
      const pg = createPagination({ count: () => 20, pageSize: () => 10 });
      pg.next(); // page 1 (last)
      pg.next(); // should be no-op
      expect(pg.pageIndex()).toBe(1);
      dispose();
    });
  });

  it('prev() is a no-op on page 0', () => {
    createRoot((dispose) => {
      const pg = createPagination({ count: () => 20, pageSize: () => 10 });
      pg.prev(); // should be no-op
      expect(pg.pageIndex()).toBe(0);
      dispose();
    });
  });

  it('canPrev is true after next()', () => {
    createRoot((dispose) => {
      const pg = createPagination({ count: () => 30, pageSize: () => 10 });
      pg.next();
      expect(pg.canPrev()).toBe(true);
      dispose();
    });
  });

  it('canNext is false on the last page', () => {
    createRoot((dispose) => {
      const pg = createPagination({ count: () => 20, pageSize: () => 10 });
      pg.next(); // last page
      expect(pg.canNext()).toBe(false);
      dispose();
    });
  });

  it('full forward+backward cycle', () => {
    createRoot((dispose) => {
      const pg = createPagination({ count: () => 30, pageSize: () => 10 });

      expect(pg.pageIndex()).toBe(0);
      pg.next();
      expect(pg.pageIndex()).toBe(1);
      pg.next();
      expect(pg.pageIndex()).toBe(2);
      expect(pg.canNext()).toBe(false);
      pg.prev();
      expect(pg.pageIndex()).toBe(1);
      pg.prev();
      expect(pg.pageIndex()).toBe(0);
      expect(pg.canPrev()).toBe(false);

      dispose();
    });
  });
});

// ---------------------------------------------------------------------------
// setPageIndex — clamping
// ---------------------------------------------------------------------------

describe('createPagination — setPageIndex clamping', () => {
  it('jumps to a valid page', () => {
    createRoot((dispose) => {
      const pg = createPagination({ count: () => 30, pageSize: () => 10 });
      pg.setPageIndex(2);
      expect(pg.pageIndex()).toBe(2);
      dispose();
    });
  });

  it('clamps negative index to 0', () => {
    createRoot((dispose) => {
      const pg = createPagination({ count: () => 30, pageSize: () => 10 });
      pg.setPageIndex(-5);
      expect(pg.pageIndex()).toBe(0);
      dispose();
    });
  });

  it('clamps too-large index to last page', () => {
    createRoot((dispose) => {
      const pg = createPagination({ count: () => 30, pageSize: () => 10 });
      pg.setPageIndex(999);
      expect(pg.pageIndex()).toBe(2); // pageCount - 1
      dispose();
    });
  });

  it('stays on 0 when pageCount is 0', () => {
    createRoot((dispose) => {
      const pg = createPagination({ count: () => 0, pageSize: () => 10 });
      pg.setPageIndex(1);
      expect(pg.pageIndex()).toBe(0);
      dispose();
    });
  });
});

// ---------------------------------------------------------------------------
// Reactive updates
// ---------------------------------------------------------------------------

describe('createPagination — reactive count / pageSize changes', () => {
  it('pageCount updates when count changes', () => {
    createRoot((dispose) => {
      const [count, setCount] = createSignal(10);
      const pg = createPagination({ count, pageSize: () => 10 });

      expect(pg.pageCount()).toBe(1);
      setCount(50);
      expect(pg.pageCount()).toBe(5);

      dispose();
    });
  });

  it('pageCount updates when pageSize changes', () => {
    createRoot((dispose) => {
      const [size, setSize] = createSignal(10);
      const pg = createPagination({ count: () => 100, pageSize: size });

      expect(pg.pageCount()).toBe(10);
      setSize(25);
      expect(pg.pageCount()).toBe(4);

      dispose();
    });
  });

  it('pageItems updates when count changes', () => {
    createRoot((dispose) => {
      const [count, setCount] = createSignal(5);
      const pg = createPagination({ count, pageSize: () => 10 });

      expect(pg.pageItems()).toEqual([0, 1, 2, 3, 4]);
      setCount(12);
      expect(pg.pageItems()).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);

      dispose();
    });
  });
});
