# Brief — observability: трейс ВСЕХ layer-wrappers (owner @capsuletech/web-core)

**ADR:** [[062-runtime-observability-trace-channel]]. **Зона:** `packages/web/runtime/core/src/wrappers/`. **Приоритет: P1** (observability-долг).

## Зачем

Сейчас mount/dispose затрейсен **только в Page** (`page.tsx`, commit `7e19c4e1`). Из-за этого дубль-инстанциацию в **Widget**-обёртке (bug A) НЕ было видно в трейсе — пришлось руками бисектить app-композицию (убирать Matrix / Features.Canvas / Flex по очереди). Если бы все layer-wrappers трейсили mount/dispose, дамп сразу показал бы `web-core.widget:mount ×2` и локализация заняла бы один заход.

Прецедент-урок: [[feedback_trace_missing_node_not_remove]] — узел на пути бага должен быть покрыт.

## Что сделать

Добавить **постоянную** mount/dispose-инструментацию (как в `page.tsx:24-26`) в КАЖДУЮ layer-обёртку:
- `view.tsx` (ViewWrapper),
- `widget.tsx` (WidgetWrapper),
- `shape/wrapper.tsx` (Shape),
- `controller.tsx` (ControllerWrapper) и `feature.tsx` (FeatureWrapper) — если общий движок `engine/logic-wrapper`, поставить там один раз с различением kind.

Паттерн (зеркало `page.tsx`):
```ts
const __traceId = createUniqueId();
trace('web-core.widget', 'mount', { id: __traceId });   // node по слою
onCleanup(() => trace('web-core.widget', 'dispose', { id: __traceId }));
```
- node по слою: `web-core.view` / `web-core.widget` / `web-core.shape` / `web-core.controller` / `web-core.feature` (Page уже = `web-core.page`). Либо единый node `web-core.wrapper` + `{ layer: 'widget' }` в data — на твой вкус, но **консистентно** с уже существующим `web-core.page`.
- уровень `debug`. No-op когда trace-канал off. Ставить в тело компонент-функции (per-instance), как в Page.
- Если дёшево доступно имя слота/компонента — добавь в data (`{ id, name }`); если нет — `id` достаточно.

## Что покажет

Любой будущий дубль/leak слоя виден в одном дампе: `web-core.<layer>:mount` без парного `dispose` = осиротевший owner; `mount ×N` = N-кратная инстанциация. Без ручной бисекции.

## Проверка

`pnpm --filter @capsuletech/web-core test` + `build` — вернуть последние строки + список затронутых файлов/нод.

## НЕ делать
- Только trace-вызовы, логику обёрток НЕ менять (фикс Widget — отдельный бриф `brief-fix-widget-wrapper-double-render.md`).
- Не трогать apps/*. Push не делать — commit-only.
