import type { AnyRoute } from '@tanstack/router-core';
import {
  Navigate,
  createRouter as createTanStackRouter,
  type Router as TanStackRouter,
} from '@tanstack/solid-router';
import {
  type ICapsuleRouter,
  type ICapsuleRouterContext,
  type ICreateRouterOpts,
  type IGoToOpts,
  normalizeBase,
  wrap,
} from './types';

/**
 * Создать инстанс TanStack-роутера и обернуть его в `ICapsuleRouter`.
 * Возвращает пару: «сырой» роутер для `<RouterProvider>` и обёртка для services.
 *
 * Generic `TRouteTree` выводится из `opts.routeTree` — у вызывающей стороны
 * получаются типизированные `raw.navigate({ to: '...' })` без явного указания
 * generic-параметра.
 *
 * Если задан `opts.notFoundRedirect` — при попадании на несуществующий маршрут
 * произойдёт replace-навигация на указанный путь (без записи в history).
 * Работает через `defaultNotFoundComponent` TanStack: если route/rootRoute задаёт
 * собственный `notFoundComponent` — он имеет приоритет.
 */
export const createRouter = <TRouteTree extends AnyRoute>(opts: ICreateRouterOpts<TRouteTree>) => {
  const notFoundRedirect = opts.notFoundRedirect;

  const raw = createTanStackRouter({
    routeTree: opts.routeTree,
    context: opts.context ?? {},
    basepath: normalizeBase(opts.basepath),
    ...(notFoundRedirect !== undefined
      ? {
          defaultNotFoundComponent: () =>
            Navigate({ to: notFoundRedirect, replace: true } as never),
        }
      : {}),
  });

  return {
    raw: raw as TanStackRouter<TRouteTree>,
    capsuleRouter: wrap<TRouteTree>(raw as never),
  };
};

export type { ICapsuleRouter, ICapsuleRouterContext, ICreateRouterOpts, IGoToOpts, TanStackRouter };
