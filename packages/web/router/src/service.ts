import type { AnyRoute } from '@tanstack/router-core';
import {
  createRouter as createTanStackRouter,
  Navigate,
  type Router as TanStackRouter,
} from '@tanstack/solid-router';
import {
  type IBeforeLoadContext,
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

  // Если задан `beforeLoad`-хук — вешаем его на root-route до передачи дерева
  // в `createTanStackRouter`. TanStack читает `route.options.beforeLoad` напрямую
  // при каждой навигации (load-matches.js:275).
  //
  // Почему не `.update()`: метод `Route.update()` принимает `UpdatableRouteOptions`,
  // который **не содержит** `beforeLoad` (только onEnter/onLeave/onStay и стайлинг).
  // Прямая запись в `route.options` типово корректна — поле `beforeLoad` входит в
  // `RouteOptions` (базовый тип свойства `.options`). Cast к `AnyRoute` нужен только
  // потому что `TRouteTree` — bounded generic и TS не может narrowed-совместить
  // конкретный `TBeforeLoadFn` с нашим `IBeforeLoadContext`-колбэком.
  if (opts.beforeLoad !== undefined) {
    // biome-ignore lint/suspicious/noExplicitAny: AnyRoute['options']['beforeLoad'] имеет тип any через TBeforeLoadFn=any; cast нужен чтобы обойти несовместимость с конкретным TRouteTree-generic'ом.
    (opts.routeTree as AnyRoute).options.beforeLoad = opts.beforeLoad as any;
  }

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

export type {
  IBeforeLoadContext,
  ICapsuleRouter,
  ICapsuleRouterContext,
  ICreateRouterOpts,
  IGoToOpts,
  TanStackRouter,
};
