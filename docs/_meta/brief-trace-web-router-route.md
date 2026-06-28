# Brief — трейс жизненного цикла роута (owner-web-router)

**ADR:** [[062-runtime-observability-trace-channel]] (постоянная инструментация узла). **Зона:** `packages/web/runtime/router/` (scope `web-router`).

## Контекст (охота bug A)
Виджет канваса монтируется **дважды** в студийной композиции. Подозрение (B): **обе дочерние вкладки студии (`store` + `creator`) смонтированы разом** (в `apps/.../web-studio/index.tsx` коммент про «персистентность дочерних роутов»; обе держат `<Canvas instanceId="main">`). Нужно видеть монтаж/демонтаж роутов трейсом.

## Что сделать
Инструментировать рендер matched-роута / `Outlet` `trace`-ом (постоянно, no-op когда off):
- Где web-router рендерит matched-роут (обёртка `Outlet` / `RouterProvider` / точка, где TanStack-роут-компонент попадает в дерево) → `trace('router.route', 'mount', { path | id })` + `onCleanup(() => trace('router.route', 'dispose', { path | id }))`.
- node-префикс `router.*`, уровень `debug`. Импорт `trace` из `@capsuletech/web-profiler/trace` (лёгкий субпат, no-op когда off). Добавить `@capsuletech/web-profiler` в deps, если нет.

**Caveat:** web-router — тонкая обёртка над `@tanstack/solid-router`; рендер роут-компонентов делает TanStack. Если **чистой точки** для per-route mount нет (Outlet — TanStack'овый, без wrap-хука) — **флагни architect'у**, не натягивай. Тогда монтаж роутов покроем на app-уровне (Page-тела `store`/`creator`), а web-router-трейс ограничим навигацией (`goTo`/`back`/`current`).

## Что покажет
В браузере (трейс по дефолту on) при заходе на `/workspace/web-studio/store`: если в консоли `router.route:mount` и для `store`, И для `creator` разом → подозрение (B) подтверждено (обе вкладки активны).

## Проверка
`pnpm --filter @capsuletech/web-router test` + `build`. Вернуть последние строки + что вышло (инструментировал mount роута / или нет чистой точки → флаг).

## НЕ делать
- НЕ менять логику роутинга — только инструментация. НЕ трогать apps/*. Push не делать (commit-only).
