import {
  type AnyRouter,
  type Router as TanStackRouter,
  createRouter as createTanStackRouter,
} from '@tanstack/solid-router';

/**
 * Контекст роутера на старте — пробрасывается в каждый route как `match.context`.
 * Используется для guards (например, `beforeLoad` с проверкой `isAuthenticated`).
 */
export interface ICapsuleRouterContext {
  isAuthenticated?: boolean;
  [k: string]: unknown;
}

/**
 * Публичный API роутера, который инжектится в Controller/Feature через `services.router`.
 * Скрывает детали TanStack — если когда-то поменяем движок, signature останется.
 */
export interface ICapsuleRouter {
  goTo(path: string, params?: Record<string, unknown>): void;
  back(): void;
  current(): string;
  /** Escape hatch для случаев, когда нужны API-возможности TanStack напрямую. */
  raw: AnyRouter;
}

/** Опции фабрики. `context` — initial-context роутера; `routeTree` обязателен. */
export interface ICreateRouterOpts {
  routeTree: any;
  context?: ICapsuleRouterContext;
}

const wrap = (raw: AnyRouter): ICapsuleRouter => ({
  raw,
  goTo: (path, params) => {
    raw.navigate({ to: path as any, params } as any);
  },
  back: () => {
    history.back();
  },
  current: () => raw.state.location.pathname,
});

/**
 * Создать инстанс TanStack-роутера и обернуть его в `ICapsuleRouter`.
 * Возвращает пару: «сырой» роутер для `<RouterProvider>` и обёртка для services.
 */
export const createRouter = (opts: ICreateRouterOpts) => {
  const raw = createTanStackRouter({
    routeTree: opts.routeTree,
    context: opts.context ?? {},
  }) as unknown as AnyRouter;

  return {
    raw,
    capsuleRouter: wrap(raw),
  };
};

export type { TanStackRouter };
