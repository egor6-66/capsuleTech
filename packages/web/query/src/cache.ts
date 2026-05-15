import type { QueryKey, QueryState } from './types';

interface CacheEntry<T = unknown> {
  key: QueryKey;
  state: QueryState<T>;
  /** Текущий in-flight Promise, для dedupe параллельных fetch'ей. */
  inFlight: Promise<T> | null;
}

const serializeKey = (key: QueryKey): string => JSON.stringify(key);

/**
 * Проверка: `key` начинается с `prefix`. Используется для префиксной инвалидации:
 * `invalidate(['users'])` бьёт `['users', 'page', 1]`, `['users', filterX]` и т.д.
 */
const isPrefix = (key: QueryKey, prefix: QueryKey): boolean => {
  if (prefix.length > key.length) return false;
  for (let i = 0; i < prefix.length; i++) {
    if (serializeKey([key[i]]) !== serializeKey([prefix[i]])) return false;
  }
  return true;
};

/** Map-кэш с сериализованным JSON-ключом. */
export class QueryCache {
  private map = new Map<string, CacheEntry>();

  get<T = unknown>(key: QueryKey): CacheEntry<T> | undefined {
    return this.map.get(serializeKey(key)) as CacheEntry<T> | undefined;
  }

  set<T>(key: QueryKey, entry: CacheEntry<T>): void {
    this.map.set(serializeKey(key), entry as CacheEntry);
  }

  delete(key: QueryKey): void {
    this.map.delete(serializeKey(key));
  }

  /** Префиксная инвалидация — отмечает все matched entries как stale (`fetchedAt = 0`). */
  invalidate(prefix: QueryKey): void {
    for (const entry of this.map.values()) {
      if (isPrefix(entry.key, prefix)) entry.state.fetchedAt = 0;
    }
  }

  clear(): void {
    this.map.clear();
  }
}

/** Для использования в client.ts при формировании syncTo-ключа ошибок. */
export const keyToString = serializeKey;
