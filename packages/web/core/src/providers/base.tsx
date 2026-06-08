import { VitalsMonitoringProvider } from '@capsuletech/web-profiler';
import {
  type AnyRoute,
  createRouter,
  type ICapsuleRouter,
  type ICapsuleRouterContext,
  type ICreateRouterOpts,
  RouterContext,
  RouterProvider,
} from '@capsuletech/web-router';
import { Show } from 'solid-js';

interface IBaseProviderProps<TRouteTree extends AnyRoute = AnyRoute> {
  routeTree?: TRouteTree;
  /** Initial-context роутера (для guards в TanStack-роутах). */
  routerContext?: ICapsuleRouterContext;
  /**
   * URL-базовый путь приложения (под-путь раздачи, например `/ewc/`).
   * Обычно прокидывается генерируемым bootstrap'ом как `import.meta.env.BASE_URL`.
   * Передаётся в роутер как `basepath` → клиентская навигация работает под под-путём.
   */
  basepath?: string;
  /**
   * Включить Vitals-мониторинг (Web Vitals + 4 доп. coll.). По умолчанию выключен,
   * чтобы прод-бандлы apps/<app> не тянули overhead профайлера без необходимости.
   *
   *  - `true` — оборачивает дерево в `VitalsMonitoringProvider` с дашбордом.
   *  - `false` / `undefined` — без обёртки.
   *
   * Для тонкой настройки (collectors / reporters / showDashboard=false) —
   * используй `<ProfilerProvider>` из `@capsuletech/web-profiler/providers` напрямую.
   */
  vitals?: boolean;
  /**
   * Показывать ли встроенный Dashboard-оверлей. Игнорируется если `vitals !== true`.
   * Default — `true` (вместе с `vitals`).
   */
  showDashboard?: boolean;
  /**
   * Путь редиректа при notFound. По умолчанию '/' — несовпавшие маршруты ведут
   * на корень basepath, откуда app-роутинг/auth решает дальше. Прокидывается
   * генерируемым bootstrap'ом из capsule.app.ts → router.notFoundRedirect.
   */
  notFoundRedirect?: string;
  /**
   * Глобальный guard на root-route. Получает TanStack beforeLoad-контекст
   * (location/params/search/context/cause). Может быть async, бросать
   * redirect()/notFound() из @capsuletech/web-router.
   * Роутер не знает про auth — вся политика тут.
   */
  beforeLoad?: ICreateRouterOpts['beforeLoad'];
  /**
   * Включить нативные переходы между роутами через View Transitions API.
   *
   * `undefined` или `'none'` → переходы выключены (дефолт).
   * `true` → `createRouter` получает `viewTransition: true` →
   * TanStack Router вызывает `document.startViewTransition()` на каждом
   * переходе. Внешний вид задаётся через CSS `::view-transition-*` в
   * `@capsuletech/web-style`.
   *
   * Прокидывается генерируемым bootstrap'ом из capsule.app.ts → router.transition.
   */
  transition?: boolean | 'none';
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
  // transition truthy && != 'none' → включаем View Transitions API в роутере.
  const viewTransitionEnabled = (): boolean => {
    const t = props.transition;
    return t != null && t !== 'none' && t !== false;
  };

  const tree = (
    <Show when={props.routeTree} fallback={props.children}>
      {(routeTree) => {
        const { raw, capsuleRouter } = createRouter<TRouteTree>({
          routeTree: routeTree() as TRouteTree,
          context: props.routerContext,
          basepath: props.basepath,
          notFoundRedirect: props.notFoundRedirect ?? '/',
          beforeLoad: props.beforeLoad,
          viewTransition: viewTransitionEnabled(),
        });
        return (
          // RouterContext is parameterised on the default AnyRoute branch;
          // narrowing it to the local TRouteTree would force every consumer
          // to thread the same generic. The widening cast is safe because
          // the runtime shape is identical.
          <RouterContext.Provider value={capsuleRouter as unknown as ICapsuleRouter}>
            <RouterProvider router={raw} />
          </RouterContext.Provider>
        );
      }}
    </Show>
  );

  return (
    <Show when={props.vitals} fallback={tree}>
      <VitalsMonitoringProvider showDashboard={props.showDashboard !== false}>
        {tree}
      </VitalsMonitoringProvider>
    </Show>
  );
}
