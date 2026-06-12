import type { Registry } from './types';

/**
 * Per-registry кеш резолвов. Ключ — ссылка на сам `registry` (WeakMap значит,
 * что когда host «забыл» Registry, кеш автоматически уберётся GC). Значение —
 * Map с path → resolved (включая `undefined` для несуществующих путей, чтобы
 * не пере-вычислять промахи).
 *
 * Контракт: registry считается **immutable**. Если host мутирует registry
 * после первого `resolvePath`, кешированный ответ останется стейл. На практике
 * registry собирается один раз при бутстрапе app — это безопасно.
 */
const caches = new WeakMap<Registry, Map<string, unknown>>();

/**
 * Резолвит dot-path в registry. `'ui.Field.Label'` → `registry.ui.Field.Label`.
 *
 * Возвращает `undefined`, если по пути что-то отсутствует — renderer сам
 * решит, что с этим делать (fallback / dev-warning).
 *
 * Мемоизирован per-registry (см. `caches` выше). Для большого дерева renderer
 * вызывает `resolvePath` десятки раз на пересборку — без кеша каждый раз делается
 * `path.split('.')` + walk; с кешем — один lookup в Map.
 */
export const resolvePath = (registry: Registry, path: string): unknown => {
  if (!path) return undefined;

  let cache = caches.get(registry);
  if (!cache) {
    cache = new Map();
    caches.set(registry, cache);
  }
  if (cache.has(path)) return cache.get(path);

  const segments = path.split('.');
  let cur: any = registry;
  for (const seg of segments) {
    if (cur == null) {
      cache.set(path, undefined);
      return undefined;
    }
    cur = cur[seg];
  }
  cache.set(path, cur);
  return cur;
};
