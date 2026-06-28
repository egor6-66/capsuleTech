# Brief — трейс монтажа слотов Matrix (owner-boost-layout)

**ADR:** [[062-runtime-observability-trace-channel]] (постоянная инструментация узла). **Зона:** `packages/web/boost/layout/` (scope `boost-layout`).

## Контекст (охота bug A)
Виджет канваса монтируется **дважды** в студийной композиции (2 `RemoteComponent` на один `<Remote.View>`; web-remote доказан чистым, route-Matrix исключён прямым тестом — Canvas без Matrix всё равно двоит). Покрываем подозрения трейсом постоянно. **`Matrix` — один из узлов:** надо видеть, не **двоит ли Matrix рендер контента слота** (главный или любого).

## Что сделать
Инструментировать рендер слота Matrix `trace`-ом (постоянно, no-op когда off):
- Где Matrix рендерит `slot.children` (на каждый слот) → `trace('boost-layout.matrix.slot', 'mount', { slot: <name>, preset })` + `onCleanup(() => trace('boost-layout.matrix.slot', 'dispose', { slot }))`.
- node-префикс `boost-layout.*`. Уровень `debug`.
- Импорт `trace` из `@capsuletech/web-profiler/trace` (лёгкий субпат, no-op когда тогл off). Добавить `@capsuletech/web-profiler` (`workspace:*`) в deps boost-layout, если нет. Гард — внутри `trace()`, руками не гейтить.

## Что покажет
В браузере (трейс включён по дефолту: `localStorage['capsule.trace']='*'`) при заходе в студию: сколько раз монтируется контент каждого слота. **Слот `main` с `mount` дважды → Matrix двоит рендер слота** (корень здесь). Один → Matrix чист, копаем выше (Outlet/route).

## Проверка
`pnpm --filter @capsuletech/boost-layout test` + `build`. Вернуть последние строки. (Браузер-верификацию двойного слота сделает architect.)

## НЕ делать
- НЕ менять логику Matrix/swap — только инструментация. НЕ трогать apps/*. Push не делать (commit-only).
