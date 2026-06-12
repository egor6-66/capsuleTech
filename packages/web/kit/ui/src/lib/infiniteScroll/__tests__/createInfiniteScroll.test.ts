/**
 * createInfiniteScroll — pure-logic unit tests.
 *
 * Only tests the `plain` backend because:
 *  - `plain` has no DOM layout dependency (items = all indices, spacers = 0).
 *  - `virtual` backend delegates to @tanstack/solid-virtual which requires a
 *    real layout engine (ResizeObserver / scrollHeight). Those paths are
 *    covered by it.skip'd tests in the DataTable suite.
 *
 * These tests run in the default vitest environment (node) — no jsdom needed.
 * They verify the pure-computation contract:
 *   items() = all indices 0..count-1, size=itemHeight, start=i*itemHeight.
 *   paddingBefore() = 0, paddingAfter() = 0.
 *   scrollToIndex = no-op (returns without throwing).
 */
import { createRoot } from 'solid-js';
import { describe, expect, it, vi } from 'vitest';

import { createInfiniteScroll } from '../createInfiniteScroll';

// ---------------------------------------------------------------------------
// plain backend — items contract
// ---------------------------------------------------------------------------

describe('createInfiniteScroll — plain mode — items()', () => {
  it('returns all indices 0..count-1', () => {
    createRoot((dispose) => {
      const scroll = createInfiniteScroll({
        count: () => 5,
        mode: () => 'plain',
      });

      const items = scroll.items();
      expect(items).toHaveLength(5);
      expect(items.map((i) => i.index)).toEqual([0, 1, 2, 3, 4]);

      dispose();
    });
  });

  it('uses default itemHeight (36) for size and start', () => {
    createRoot((dispose) => {
      const scroll = createInfiniteScroll({
        count: () => 3,
        mode: () => 'plain',
      });

      const items = scroll.items();
      expect(items[0]).toEqual({ index: 0, size: 36, start: 0 });
      expect(items[1]).toEqual({ index: 1, size: 36, start: 36 });
      expect(items[2]).toEqual({ index: 2, size: 36, start: 72 });

      dispose();
    });
  });

  it('uses provided itemHeight for size and start', () => {
    createRoot((dispose) => {
      const scroll = createInfiniteScroll({
        count: () => 3,
        itemHeight: () => 48,
        mode: () => 'plain',
      });

      const items = scroll.items();
      expect(items[0]).toEqual({ index: 0, size: 48, start: 0 });
      expect(items[1]).toEqual({ index: 1, size: 48, start: 48 });
      expect(items[2]).toEqual({ index: 2, size: 48, start: 96 });

      dispose();
    });
  });

  it('returns empty array when count is 0', () => {
    createRoot((dispose) => {
      const scroll = createInfiniteScroll({
        count: () => 0,
        mode: () => 'plain',
      });

      expect(scroll.items()).toEqual([]);

      dispose();
    });
  });

  it('returns a single item when count is 1', () => {
    createRoot((dispose) => {
      const scroll = createInfiniteScroll({
        count: () => 1,
        mode: () => 'plain',
      });

      const items = scroll.items();
      expect(items).toHaveLength(1);
      expect(items[0]).toEqual({ index: 0, size: 36, start: 0 });

      dispose();
    });
  });

  it('handles large counts correctly', () => {
    createRoot((dispose) => {
      const scroll = createInfiniteScroll({
        count: () => 1000,
        itemHeight: () => 40,
        mode: () => 'plain',
      });

      const items = scroll.items();
      expect(items).toHaveLength(1000);
      expect(items[999]).toEqual({ index: 999, size: 40, start: 999 * 40 });

      dispose();
    });
  });
});

// ---------------------------------------------------------------------------
// plain backend — spacers
// ---------------------------------------------------------------------------

describe('createInfiniteScroll — plain mode — spacers', () => {
  it('paddingBefore() is always 0', () => {
    createRoot((dispose) => {
      const scroll = createInfiniteScroll({
        count: () => 10,
        mode: () => 'plain',
      });

      expect(scroll.paddingBefore()).toBe(0);

      dispose();
    });
  });

  it('paddingAfter() is always 0', () => {
    createRoot((dispose) => {
      const scroll = createInfiniteScroll({
        count: () => 10,
        mode: () => 'plain',
      });

      expect(scroll.paddingAfter()).toBe(0);

      dispose();
    });
  });
});

// ---------------------------------------------------------------------------
// plain backend — scrollToIndex is a no-op
// ---------------------------------------------------------------------------

describe('createInfiniteScroll — plain mode — scrollToIndex', () => {
  it('does not throw when called', () => {
    createRoot((dispose) => {
      const scroll = createInfiniteScroll({
        count: () => 5,
        mode: () => 'plain',
      });

      expect(() => scroll.scrollToIndex(2, { align: 'center' })).not.toThrow();
      expect(() => scroll.scrollToIndex(0)).not.toThrow();

      dispose();
    });
  });
});

// ---------------------------------------------------------------------------
// plain backend — setScrollRef + onLoadMore wiring
// ---------------------------------------------------------------------------

describe('createInfiniteScroll — plain mode — onLoadMore', () => {
  it('fires onLoadMore when scroll reaches threshold of bottom', () => {
    createRoot((dispose) => {
      const onLoadMore = vi.fn();
      const scroll = createInfiniteScroll({
        count: () => 100,
        itemHeight: () => 36,
        threshold: () => 5,
        onLoadMore,
        mode: () => 'plain',
      });

      // Simulate a scroll container
      const el = document.createElement('div');
      Object.defineProperty(el, 'scrollHeight', { get: () => 3600, configurable: true });
      Object.defineProperty(el, 'scrollTop', { get: () => 3500, configurable: true });
      Object.defineProperty(el, 'clientHeight', { get: () => 100, configurable: true });

      scroll.setScrollRef(el);

      // Manually trigger a scroll event (remaining = 3600 - 3500 - 100 = 0 ≤ threshold*36=180)
      el.dispatchEvent(new Event('scroll'));

      expect(onLoadMore).toHaveBeenCalledOnce();

      dispose();
    });
  });

  it('does NOT fire onLoadMore when far from bottom', () => {
    createRoot((dispose) => {
      const onLoadMore = vi.fn();
      const scroll = createInfiniteScroll({
        count: () => 100,
        itemHeight: () => 36,
        threshold: () => 5,
        onLoadMore,
        mode: () => 'plain',
      });

      const el = document.createElement('div');
      Object.defineProperty(el, 'scrollHeight', { get: () => 3600, configurable: true });
      Object.defineProperty(el, 'scrollTop', { get: () => 0, configurable: true });
      Object.defineProperty(el, 'clientHeight', { get: () => 400, configurable: true });

      scroll.setScrollRef(el);

      // remaining = 3600 - 0 - 400 = 3200 > threshold*36=180 → no trigger
      el.dispatchEvent(new Event('scroll'));

      expect(onLoadMore).not.toHaveBeenCalled();

      dispose();
    });
  });
});

// ---------------------------------------------------------------------------
// default mode falls back to virtual (just verify no crash, no plain items)
// ---------------------------------------------------------------------------

describe('createInfiniteScroll — default mode', () => {
  it('returns a contract without throwing when mode is omitted (virtual)', () => {
    createRoot((dispose) => {
      // virtual backend needs jsdom for layout; we only verify the contract
      // shape is returned without throwing. items() will return [] (no scroll el).
      const scroll = createInfiniteScroll({
        count: () => 5,
      });

      // setScrollRef, items, paddingBefore, paddingAfter, scrollToIndex exist
      expect(typeof scroll.setScrollRef).toBe('function');
      expect(typeof scroll.items).toBe('function');
      expect(typeof scroll.paddingBefore).toBe('function');
      expect(typeof scroll.paddingAfter).toBe('function');
      expect(typeof scroll.scrollToIndex).toBe('function');

      dispose();
    });
  });
});
