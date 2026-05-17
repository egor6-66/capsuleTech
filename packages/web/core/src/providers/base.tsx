import { VitalsMonitoringProvider } from '@capsuletech/web-profiler';
import {
  type AnyRoute,
  type ICapsuleRouterContext,
  RouterContext,
  RouterProvider,
  createRouter,
} from '@capsuletech/web-router';
import { Show } from 'solid-js';

interface IBaseProviderProps<TRouteTree extends AnyRoute = AnyRoute> {
  routeTree?: TRouteTree;
  /** Initial-context роутера (для guards в TanStack-роутах). */
  routerContext?: ICapsuleRouterContext;
  /**
   * Включить Vitals-мониторинг (Web Vitals + Dashboard). По умолчанию выключен,
   * чтобы прод-бандлы apps/<app> не тянули overhead профайлера без необходимости.
   *
   *  - `true` — оборачивает дерево в `VitalsMonitoringProvider` с дашбордом.
   *  - `false` / `undefined` — без обёртки.
   *
   * Для тонкой настройки (например, `showDashboard={false}` под staging-сборку)
   * — пока обращаемся к `<VitalsMonitoringProvider>` напрямую из приложения.
   */
  vitals?: boolean;
  children?: any;
}

/**
 * `BaseProviders` — корневой набор провайдеров для apps/<app>. Generic `TRouteTree`
 * выводится из переданного `routeTree`: если apps/<app>/.capsule/routes/routeTree.gen.ts
 * получит реальный тип (сейчас `@ts-nocheck`), `raw.navigate({ to: '...' })` сразу
 * заколосится автокомплитом. Если не передан — fallback к `AnyRoute` (поведение
 * старого `routeTree?: any`).
 */
export function BaseProviders<TRouteTree extends AnyRoute = AnyRoute>(
  props: IBaseProviderProps<TRouteTree>,
) {
  const tree = (
    <Show when={props.routeTree} fallback={props.children}>
      {(routeTree) => {
        const { raw, capsuleRouter } = createRouter<TRouteTree>({
          routeTree: routeTree() as TRouteTree,
          context: props.routerContext,
        });
        return (
          <RouterContext.Provider value={capsuleRouter}>
            <RouterProvider router={raw} />
          </RouterContext.Provider>
        );
      }}
    </Show>
  );

  return (
    <Show when={props.vitals} fallback={tree}>
      <VitalsMonitoringProvider>{tree}</VitalsMonitoringProvider>
    </Show>
  );
}
