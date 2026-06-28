# Brief — трейс mount/dispose в Page-обёртке (owner @capsuletech/web-core)

**ADR:** [[062-runtime-observability-trace-channel]]. **Зона:** `packages/web/core/src/` (Page-wrapper). Аналог `e411e0bd` (slot:mount/dispose в boost-layout) и `router.route` в `CapsuleOutlet` — постоянная trace-инструментация жизненного цикла узла.

## Зачем (охота bug A — закрываем последнюю дырку в трейсе)

Дамп трейсов уже доказал:
- На 1 `<Remote.View>` монтируется **2 `RemoteComponent`** (`remote.component:mount` ×2), один не диспозится → утечка подписок транспорта → **дубль-receive** (bug A).
- **Весь стор-субтри двоится**: все 4 слота Matrix (`boost-layout.matrix.slot:render/mount`) идут ×2. Значит **leaf-Page `store.tsx` инстанцируется дважды**, канвас — следствие.
- `transition:true` НЕ виноват (при `transition:false` та же картина: mount ×2, subscribers 4).
- web-remote и boost-layout проводку имеют корректную (всё на `onCleanup`).

**Единственный непокрытый узел** — момент инстанциации самого **leaf-Page**. Цепочка:
```
TanStack <Outlet/> → Ui.Outlet (web-core) → CapsuleOutlet (web-router, трейсит КОНТЕЙНЕР)
   → <Page>-leaf (store.tsx)  ← здесь трейса НЕТ
   → Matrix → слоты → canvas
```
CapsuleOutlet трейсит контейнер-Outlet, а matched leaf рендерит vendor-`<Outlet/>` внутри — мы его не видим. Из-за этого видно «субтри удвоился», но **не видно, рендерится ли Page дважды сверху (роут/Outlet), или один раз, а двоит что-то ниже**. Этот трейс закрывает вопрос и локализует баг в один пакет.

## Что сделать

Добавить в **Page-обёртку** (`Page((Ui, props?) => JSX)` в `packages/web/core/src/wrappers/`) трейс жизненного цикла **на каждый инстанс Page** — в теле компонента, чтобы срабатывал per-mount:
```ts
import { trace } from '@capsuletech/web-profiler/trace';
import { createUniqueId, onCleanup } from 'solid-js';
// ...внутри компонент-функции, которую возвращает Page-wrapper:
const __traceId = createUniqueId();
trace('web-core.page', 'mount', { id: __traceId });
onCleanup(() => trace('web-core.page', 'dispose', { id: __traceId }));
```
- node `web-core.page`, phase `mount` / `dispose`, уровень `debug`.
- `id` (createUniqueId) — чтобы парить mount↔dispose и считать живые инстансы.
- Если в этой точке дёшево доступен идентификатор страницы (имя/route path через router-context) — добавь в data как `{ id, name }`; если нет — только `id` достаточно (КТО именно — скоррелируем по времени со слот-трейсами, стор-слоты файрятся сразу после своего Page mount). **Не** тянуть новые зависимости ради имени.
- Паттерн ровно как в `CapsuleOutlet.tsx` (`web-router`): `trace(...,'mount',...)` в теле + `onCleanup(() => trace(...,'dispose',...))`.

## Где именно

Точка — компонент-функция, которую возвращает `Page`-wrapper (та, что вызывается на каждый рендер страницы), а **не** фабрика верхнего уровня (она зовётся один раз на дефиниции). Если Page разделяет общий слой-движок с другими wrapper'ами — ставь трейс так, чтобы он бил **только для Page-слоя** (не для Widget/View), либо вынеси `layer: 'page'` в data. Owner решает по факту структуры wrappers.

## Что покажет

При заходе в стор для leaf `store.tsx`:
- `web-core.page:mount` **×2** / `dispose` **×1** → Page-leaf рендерится дважды и один owner сиротеет → корень bug A в **роут/Outlet-слое** (web-router / web-core Ui.Outlet), копаем там.
- `mount ×1` → Page один, а двоит что-то ниже (Matrix-обёртка / logic-wrapper) → корень в boost-layout.

Либо/либо — однозначно локализует владельца бага.

## Проверка

`pnpm --filter @capsuletech/web-core test` + `build`. Вернуть: файл/точку куда добавил трейс + последние строки теста и билда. (Браузер-чтение трейса — architect.)

## НЕ делать

- НЕ менять логику wrapper'ов — только trace-вызовы.
- НЕ трогать apps/*. Новых deps не добавлять.
- Push НЕ делать — только commit (commit-only, запушу я).
