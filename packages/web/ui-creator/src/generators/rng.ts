/**
 * mulberry32 — детерминированный PRNG, state = 32-bit seed. Fast, ~uniform
 * distribution, period 2^32. Достаточно для UI-генерации. Не использует
 * crypto / Math.random — работает в любой среде, тот же seed → та же
 * последовательность.
 */
export type Rng = () => number;

export const createRng = (seed: number): Rng => {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

/** Случайное целое в диапазоне [min, max] (включительно). */
export const randomInt = (rng: Rng, min: number, max: number): number => {
  return min + Math.floor(rng() * (max - min + 1));
};

/** Случайный элемент из массива. Бросает Error если массив пуст. */
export const pick = <T>(rng: Rng, arr: readonly T[]): T => {
  if (arr.length === 0) throw new Error('pick: empty array');
  return arr[Math.floor(rng() * arr.length)] as T;
};

/**
 * Взвешенный выбор. `weights[i]` соответствует `items[i]`. Default-вес 1.
 * Возвращает один из items.
 */
export const pickWeighted = <T>(
  rng: Rng,
  items: readonly T[],
  weights: readonly number[],
): T => {
  if (items.length === 0) throw new Error('pickWeighted: empty items');
  if (items.length !== weights.length) {
    throw new Error('pickWeighted: items and weights length mismatch');
  }
  const total = weights.reduce((sum, w) => sum + w, 0);
  if (total <= 0) throw new Error('pickWeighted: total weight is zero or negative');
  let target = rng() * total;
  for (let i = 0; i < items.length; i++) {
    target -= weights[i] as number;
    if (target <= 0) return items[i] as T;
  }
  return items[items.length - 1] as T;
};

/** Coin-flip с заданной вероятностью true (default 0.5). */
export const coin = (rng: Rng, probability = 0.5): boolean => rng() < probability;

const ID_ALPHABET = 'abcdefghijklmnopqrstuvwxyz0123456789';

/**
 * Короткий id для нод дерева через переданный RNG. В отличие от
 * `state/ids.ts:generateId` — детерминированный (не использует Math.random).
 */
export const seededId = (rng: Rng, length = 10): string => {
  let id = '';
  for (let i = 0; i < length; i++) {
    id += ID_ALPHABET[Math.floor(rng() * ID_ALPHABET.length)];
  }
  return id;
};
