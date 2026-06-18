/**
 * Re-export `AnyRoute` от TanStack — нужен потребителям как default-bound для
 * собственных generic'ов (например, `BaseProviders<TRouteTree extends AnyRoute>`).
 * Держим тут чтобы не плодить прямой импорт из `@tanstack/router-core` в web-core.
 */
export type { AnyRoute } from '@tanstack/router-core';
/**
 * Утилиты для использования внутри `beforeLoad`-хука (и `loader`'ов).
 * Ре-экспортируем из `@tanstack/solid-router`, чтобы приложение не импортировало
 * движок напрямую — абстракция web-router остаётся непрозрачной.
 *
 * Пример:
 * ```ts
 * import { redirect, notFound } from '@capsuletech/web-router';
 *
 * beforeLoad: ({ location }) => {
 *   if (!authed) throw redirect({ to: '/login' });
 * }
 * ```
 */
export { notFound, RouterProvider, redirect } from '@tanstack/solid-router';
export { CapsuleOutlet } from './CapsuleOutlet';
export { RouterContext, useRouter } from './context';
export { DepthContext } from './depthContext';
export type {
  IBeforeLoadContext,
  ICapsuleRouter,
  ICapsuleRouterContext,
  ICreateRouterOpts,
  IGoToOpts,
  TanStackRouter,
} from './service';
export { createRouter } from './service';
export { useRouteDepth } from './useRouteDepth';
