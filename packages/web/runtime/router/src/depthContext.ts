import { createContext } from 'solid-js';

/**
 * DepthContext — глубина текущего Outlet'а в иерархии маршрутов.
 *
 * Внешний `<CapsuleOutlet/>` корневого маршрута получает depth `0`,
 * каждый вложенный — `parent + 1`. Sentinel-значение `-1` означает
 * «над любым Outlet'ом» (до первого Provider'а в дереве), `useRouteDepth`
 * нормализует это через `Math.max(0, depth)` чтобы pre-router-consumers
 * получали безопасный `0`.
 *
 * Listed как отдельный leaf-файл (не внутри CapsuleOutlet.tsx) чтобы
 * `useRouteDepth.ts` мог его импортировать без JSX-зависимости.
 */
export const DepthContext = createContext<number>(-1);
