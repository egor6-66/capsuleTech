import { type Accessor, useContext } from 'solid-js';
import { DepthContext } from './depthContext';

/**
 * Returns the depth of the current Outlet in the route hierarchy.
 * Root layout = 0; nested layout = 1; its child = 2; ...
 *
 * Реализация — `useContext(DepthContext)`: значение приходит от
 * ближайшего `<CapsuleOutlet/>` родителя через `DepthContext.Provider`.
 * Sentinel `-1` (нет Provider'а в дереве) нормализуется в `0`,
 * чтобы pre-router-consumers получали безопасный default.
 *
 * **Контракт сохранён** относительно PR #298 (`Accessor<number>`),
 * impl переписан под per-Outlet context per ADR 046 Decision 4.
 * Прежняя реализация через `useMatches({ select: m => m.length - 1 })`
 * возвращала ГЛОБАЛЬНУЮ глубину самого глубокого active match'а —
 * это давало одно и то же число всем уровням вложенных Outlet'ов и
 * не решало vt-name коллизию (см. ADR 046, Problem 4).
 *
 * Использование:
 *
 * ```tsx
 * const depth = useRouteDepth();
 * <div style={{ 'view-transition-name': `region-${depth()}` }}>...</div>
 * ```
 *
 * Внутри `CapsuleOutlet` используется неявно — apps обычно дёргают
 * этот hook только если рисуют свой собственный vt-region рядом с
 * router-slot'ом.
 */
export const useRouteDepth = (): Accessor<number> => {
  const depth = useContext(DepthContext);
  return () => Math.max(0, depth);
};
