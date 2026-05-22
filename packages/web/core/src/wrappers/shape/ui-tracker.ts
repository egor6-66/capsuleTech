/**
 * Path-tracker — Proxy который запоминает цепочку property-access'ов.
 *
 * Используется в Shape factory: `ui.Navigation.Item` возвращает объект с
 * захваченным путём `['Navigation', 'Item']`. На render-этапе Shape резолвит
 * этот путь по **реальному** проксированному Ui из Entity-контекста,
 * получая правильный wrapped-компонент (с UiProxy-event-binding'ом).
 *
 * Почему так: factory вызывается на import (один раз), real proxied Ui
 * ещё не существует. Tracker позволяет декларативно ссылаться на
 * `ui.X.Y`, а резолв делается lazy в момент рендера.
 */

const PATH = Symbol.for('@capsuletech/core:shape-ui-path');

type Tracker = ((..._: unknown[]) => unknown) & {
  readonly [PATH]: readonly string[];
  readonly [key: string]: Tracker;
};

export const createUiTracker = (path: readonly string[] = []): Tracker => {
  const target = (() => undefined) as unknown as Tracker;
  return new Proxy(target, {
    get(_, key) {
      if (key === PATH) return path;
      if (typeof key === 'symbol') return undefined;
      return createUiTracker([...path, key]);
    },
  }) as Tracker;
};

/** Возвращает путь tracker'а или `undefined`, если это не tracker. */
export const getTrackerPath = (x: unknown): readonly string[] | undefined => {
  if (typeof x !== 'function' && (typeof x !== 'object' || x === null)) return undefined;
  const p = (x as Record<symbol, unknown>)[PATH];
  return Array.isArray(p) ? (p as readonly string[]) : undefined;
};

/** Walks `root` по `path` — `root.a.b.c`. */
export const resolveByPath = (root: unknown, path: readonly string[]): unknown => {
  let cur: unknown = root;
  for (const seg of path) {
    if (cur == null) return undefined;
    cur = (cur as Record<string, unknown>)[seg];
  }
  return cur;
};

/**
 * Резолв одного значения через realUi:
 *  - tracker → резолвится через resolveByPath;
 *  - функция → оборачивается: результат вызова, если это объект, резолвится рекурсивно;
 *  - остальное → pass-through.
 *
 * Глубокая рекурсия по plain-объектам намеренно НЕ делается: только функции-возвраты
 * и первый уровень definitionExtras. Это защищает `defaults` массивы и data-структуры
 * от случайного резолва вложенных tracker-значений.
 */
export const resolveValue = (value: unknown, realUi: unknown): unknown => {
  if (value === null || value === undefined) return value;

  const path = getTrackerPath(value);
  if (path !== undefined) {
    if (realUi) return resolveByPath(realUi, path);
    return value;
  }

  if (typeof value === 'function') {
    const fn = value as (...args: unknown[]) => unknown;
    return (...args: unknown[]) => {
      const result = fn(...args);
      if (result !== null && typeof result === 'object' && !Array.isArray(result)) {
        return resolveValuesInObject(result as Record<string, unknown>, realUi);
      }
      return result;
    };
  }

  return value;
};

/**
 * Резолвит все значения в shallow-объекте через resolveValue.
 * Используется для `definitionExtras` в Shape wrapper'е.
 */
export const resolveValuesInObject = (
  obj: Record<string, unknown>,
  realUi: unknown,
): Record<string, unknown> => {
  const out: Record<string, unknown> = {};
  for (const key of Object.keys(obj)) {
    out[key] = resolveValue(obj[key], realUi);
  }
  return out;
};
