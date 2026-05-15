import type { Registry } from './types';

/**
 * Резолвит dot-path в registry. `'ui.Field.Label'` → `registry.ui.Field.Label`.
 *
 * Возвращает `undefined`, если по пути что-то отсутствует — renderer сам
 * решит, что с этим делать (fallback / dev-warning).
 */
export const resolvePath = (registry: Registry, path: string): unknown => {
  if (!path) return undefined;
  const segments = path.split('.');
  let cur: any = registry;
  for (const seg of segments) {
    if (cur == null) return undefined;
    cur = cur[seg];
  }
  return cur;
};
