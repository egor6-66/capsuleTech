import { describe, expect, it } from 'vitest';
import { coin, createRng, pick, pickWeighted, randomInt, seededId } from '../rng';

describe('rng / mulberry32', () => {
  it('same seed gives same sequence', () => {
    const a = createRng(42);
    const b = createRng(42);
    const seqA = Array.from({ length: 100 }, () => a());
    const seqB = Array.from({ length: 100 }, () => b());
    expect(seqA).toEqual(seqB);
  });

  it('different seeds give different sequences', () => {
    const a = createRng(42);
    const b = createRng(43);
    const seqA = Array.from({ length: 100 }, () => a());
    const seqB = Array.from({ length: 100 }, () => b());
    expect(seqA).not.toEqual(seqB);
  });

  it('outputs are in [0, 1)', () => {
    const rng = createRng(1);
    for (let i = 0; i < 1000; i++) {
      const v = rng();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('has reasonable distribution', () => {
    const rng = createRng(123);
    const buckets = [0, 0, 0, 0];
    const N = 10_000;
    for (let i = 0; i < N; i++) {
      buckets[Math.floor(rng() * 4)]!++;
    }
    // Каждый bucket — около 2500, allow ±10% drift
    for (const count of buckets) {
      expect(count).toBeGreaterThan(N * 0.225);
      expect(count).toBeLessThan(N * 0.275);
    }
  });
});

describe('rng / randomInt', () => {
  it('range is inclusive on both ends', () => {
    const rng = createRng(7);
    const seen = new Set<number>();
    for (let i = 0; i < 1000; i++) seen.add(randomInt(rng, 1, 5));
    expect(seen).toEqual(new Set([1, 2, 3, 4, 5]));
  });

  it('handles min === max', () => {
    const rng = createRng(7);
    for (let i = 0; i < 50; i++) {
      expect(randomInt(rng, 4, 4)).toBe(4);
    }
  });
});

describe('rng / pick', () => {
  it('throws on empty array', () => {
    const rng = createRng(1);
    expect(() => pick(rng, [])).toThrow();
  });

  it('returns element from array', () => {
    const rng = createRng(1);
    const arr = ['a', 'b', 'c'];
    for (let i = 0; i < 100; i++) {
      expect(arr).toContain(pick(rng, arr));
    }
  });
});

describe('rng / pickWeighted', () => {
  it('throws on empty items', () => {
    expect(() => pickWeighted(createRng(1), [], [])).toThrow();
  });

  it('throws on length mismatch', () => {
    expect(() => pickWeighted(createRng(1), ['a', 'b'], [1])).toThrow();
  });

  it('throws on zero total weight', () => {
    expect(() => pickWeighted(createRng(1), ['a', 'b'], [0, 0])).toThrow();
  });

  it('honors weight bias', () => {
    const rng = createRng(99);
    const counts = { a: 0, b: 0 };
    // 'a' имеет вес 9, 'b' — вес 1. Должно быть ~90/10.
    for (let i = 0; i < 10_000; i++) {
      counts[pickWeighted(rng, ['a', 'b'] as const, [9, 1])]++;
    }
    expect(counts.a).toBeGreaterThan(8500);
    expect(counts.b).toBeLessThan(1500);
  });
});

describe('rng / coin', () => {
  it('returns ~50/50 at default probability', () => {
    const rng = createRng(11);
    let trues = 0;
    for (let i = 0; i < 10_000; i++) if (coin(rng)) trues++;
    expect(trues).toBeGreaterThan(4500);
    expect(trues).toBeLessThan(5500);
  });

  it('honors probability bias', () => {
    const rng = createRng(11);
    let trues = 0;
    for (let i = 0; i < 10_000; i++) if (coin(rng, 0.9)) trues++;
    expect(trues).toBeGreaterThan(8500);
    expect(trues).toBeLessThan(9500);
  });

  it('always false at probability 0', () => {
    const rng = createRng(11);
    for (let i = 0; i < 100; i++) expect(coin(rng, 0)).toBe(false);
  });
});

describe('rng / seededId', () => {
  it('is deterministic for same RNG state', () => {
    const a = createRng(50);
    const b = createRng(50);
    for (let i = 0; i < 10; i++) {
      expect(seededId(a)).toBe(seededId(b));
    }
  });

  it('uses only [a-z0-9]', () => {
    const rng = createRng(50);
    for (let i = 0; i < 100; i++) {
      expect(seededId(rng)).toMatch(/^[a-z0-9]+$/);
    }
  });

  it('respects requested length', () => {
    const rng = createRng(50);
    expect(seededId(rng, 5)).toHaveLength(5);
    expect(seededId(rng, 20)).toHaveLength(20);
  });
});
