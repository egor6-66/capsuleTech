---
tags: [hca, adr, accepted]
status: accepted
date: 2026-06-04
---

> [!info] Status
> **Accepted** — 2026-06-04. Фундаментальная конвенция экосистемы. Реализация по фазам (см. ## План), каждая фаза — отдельный PR через owner'а.

# ADR 032 — Package-integration слой (`/controllers` subpath) + `useEmit` канонический event-канал

## Контекст

HCA-event сейчас: meta-узел → `UiProxy` авто-биндит **6 захардкоженных** DOM-событий (`EVENT_HANDLERS`, ADR 009) → собирает `target` → `controller[name](target)` → `ControllerProxy` (`states[cur][name]` → top-level → `next()`). Важно: **ControllerProxy резолвит handler по ЛЮБОМУ имени** — захардкожен только DOM-авто-биндинг UiProxy.

Bespoke-интеракции из пакетов (`web-dnd` drop/drag, `web-renderer` editOverlay-select, цветные метки) — это **не** DOM-события на meta-узле. Канонического канала «эмитни semantic-событие в Controller» наружу нет → в аппах появляется escape-hatch (`useCtx`-обход, ad-hoc `apps/ui-creator/src/editor/` слой вне HCA).

**Принцип:** канон аппа (HCA) фиксирован, **пакеты подстраиваются под архитектуру, а не наоборот**. При этом generic-ядро каждого пакета обязано оставаться framework-agnostic (standalone Solid-пакет, ноль зависимости на web-core — продаётся вне фреймворка). Но capsule — один продукт, подавляющее большинство юзеров используют пакеты ВНУТРИ фреймворка, поэтому пакет может поставлять opt-in HCA-прослойку (вплоть до готовых Controller'ов), сокращая логику в аппе.

## Решение

### 1. Конвенция subpath `@capsuletech/<pkg>/controllers`

Integration-релевантные пакеты экспонируют subpath `/controllers` (multi-entry build) — HCA-прослойку, содержащую:
- готовые **Controller'ы** (собранные через web-core `Controller(...)`);
- **meta-aware entry-points**, которые сами эмитят HCA-события (напр. `createDroppable`, эмитящий `onDrop`);
- emit-проводку.

Дефолтный экспорт пакета остаётся framework-agnostic (без web-core). Зависимость на web-core изолирована в subpath'е `/controllers`, тянется только когда юзер внутри фреймворка, дерево-шейкается отдельно. (Имя `/controllers` — зонтичное: Controller'ы — headline-поставка, рядом живут и meta-aware хуки.)

### 2. Канонический канал — meta-bound emit (primary) + `useEmit` (escape)

web-core отдаёт программный близнец DOM-dispatch'а UiProxy:
- **Primary (meta-bound):** интерактивный узел декларирует, что эмитит (droppable `emits:'onDrop'`, editOverlay `emits:'onSelect'`), и сам диспатчит в ближайший Controller — **симметрично `<Input meta>`**. Entry-point собирает `target` и зовёт `controller[name](target)`.
- **Escape (low-level):** `const emit = useEmit(); emit('onDrop', { payload, meta })` — для совсем кастомных кейсов.

`target` — та же схема, что у UiProxy: `{ meta, payload, key, modifiers, dynamicMeta }`. **`EVENT_HANDLERS` НЕ трогаем** (они только про DOM-авто-биндинг). Программный emit идёт прямо в `controller[name]` — ControllerProxy уже резолвит любое имя.

### 3. Типизация имён сохраняется

Имена handler'ов типизируются через `IDefineStateSchema` Controller'а, который едет ВНУТРИ пакета. `emit`/`emits` типизируются против handler-ключей целевого контроллера. Никакого stringly-typed «открытого словаря» — строгая типизация имён в Proxy остаётся.

### 4. Ацикличный граф

Integration-subpath'ы → web-core (одно направление). web-core **НЕ зависит** на web-dnd/web-renderer/web-ui-creator. Generic-ядра не получают новых зависимостей.

### 5. Пакеты поставляют Controller'ы

Новый паттерн: пакет может определять+экспортировать Controller через web-core `Controller(...)` из своего `/controllers`. App композит его (`Controllers.Editor`), кастомизирует через `overrides`-проп (уже есть в ControllerProxy). App-логика сокращается.

## Применение — растворение `apps/ui-creator/src/editor/`

- `@capsuletech/web-ui-creator/controllers` → **`EditorController`** (HCA): tree/selection/marks в `store.ctx` + handlers `onDrop/onSelect/onMark`, поверх своих `/state` + `/manifests` + dnd-resolver'ов (`dnd.ts`/`rules.ts` переезжают из аппа в web-ui-creator).
- `@capsuletech/web-dnd/controllers` → meta-aware droppable/draggable, эмитящие `onDrop`/`onDragStart`.
- `@capsuletech/web-renderer/controllers` → editOverlay, эмитящий `onSelect`.
- `apps/ui-creator/src/editor/` **удаляется**; app = тонкие виджеты + Page, композящие `Controllers.Editor`, читающие `store.ctx` через `useCtx`.

## Последствия

- **+** Любая package-интеракция = first-class HCA-событие; ноль escape-hatch в аппах.
- **+** Generic-ядра остаются standalone (работают вне фреймворка как обычный Solid-пакет).
- **+** App-логика тает; reusable editor-машинерия — в пакете.
- **+** Типизация handler-имён сохранена.
- **−** Новая build-конвенция (multi-entry `/controllers`) во всех integration-пакетах.
- **−** web-core получает новый публичный примитив (`useEmit`) — `engine/*` больше не полностью private; нужен аккуратный контракт (gotcha #9).
- **−** Integration-subpath → web-core: новая (изолированная, ацикличная) зависимость в пакетах.

## Зависимость: механизм регистрации пакетов (interlock)

ADR 032 закрывает **логическую** половину интеграции пакета (`/controllers` + `useEmit` — как пакет эмитит HCA-события и поставляет Controller'ы). Но **как package-shipped Controller становится глобалом `Controllers.X`** — здесь не решено: текущий `Controllers.*` кодген (`ExportGeneratorPlugin`) сканирует только `apps/*/src/controllers/`, пакетный контроллер туда не попадает.

Это закрывает **отдельный, параллельно проектируемый механизм регистрации пакетов** (будущий ADR): декларация в `capsule.app.ts`

```ts
export default defineAppConfig({
  packages: { Map: '@capsuletech/web-map', Renderer: '@capsuletech/web-renderer' },
});
```

→ Vite-плагин генерит `.capsule/registry/packages.ts` (`import * as Map …; Object.assign(globalThis, { Map })`) + ambient `.d.ts`, зеркаля существующий механизм глобалов (`Views`/`Widgets`/`CapsuleSlots`). Одна декларация тянет **обе** половины: визуал (`Map.*`) и логику (`Controllers.Map` из `/controllers`).

**Фазы 3–5 ADR 032 СТОЯТ на этом механизме** (иначе пакетные контроллеры регистрируются ad-hoc-костылём, который выкинется). Поэтому порядок: механизм регистрации → потом фазы 3–5. Фазы 1–2 (useEmit, build-конвенция) независимы и уже сделаны.

**Три точки стыковки, которые механизм регистрации обязан учесть:**
1. **Одна декларация — обе половины.** `packages: { X: '@capsuletech/web-x' }` регистрирует и визуал (`X.*`), и контроллеры из `web-x/controllers` (`Controllers.X`). Кодген пакетных контроллеров **мержится** с существующим `Controllers.*` (app `src/controllers` + пакеты → один namespace + `CapsuleSlots`-типы).
2. **web-core развязка.** `Map`/`Renderer` уходят из `Ui` (хардкод `createLazy(import('@capsuletech/web-map'))` из `imports.tsx`) — `Ui` остаётся per-instance проксируемым kit'ом мелких примитивов; stateful-модули (Map/Renderer) глобалятся через `capsule.app.ts`, а не сидят в `Ui`.
3. **Редактор юзает `Renderer` напрямую** (`apps/ui-creator/src/widgets/canvas.tsx`) — он станет глобалом `Renderer.*`; это всё равно переписывается в фазе 5.

## План (фазы; каждая — свой PR через owner'а)

1. ✅ **web-core** (owner-web-core): `useEmit` + meta-bound emit-контракт + reuse target-схемы + тесты. ADR-defining примитив. *(сделано 2026-06-04)*
2. ✅ **build-конвенция** `/controllers` multi-entry subpath (owner-builders + lib-builder). *(сделано 2026-06-04 — машинерия уже была, зафиксирована конвенция в `docs/_meta/builders.md`)*
3. ⏸ **МЕХАНИЗМ РЕГИСТРАЦИИ ПАКЕТОВ** (отдельный ADR, см. ## Зависимость выше) — `capsule.app.ts: packages:` → глобалы `X.*` + `Controllers.X`. **Блокирует фазы 4–5.**
4. **web-dnd/controllers** (owner-web-dnd) + **web-renderer/controllers** (owner-web-renderer) — meta-aware emit entry-points.
5. **web-ui-creator** (owner-web-ui-creator): впитать `dnd.ts`/`rules.ts` из аппа в `/state`+`/manifests`; `/controllers` → `EditorController`.
6. **app** (apps/ui-creator): удалить `editor/`, переписать виджеты на `Controllers.Editor` + `useCtx`.

## EditorController-контракт (детализация фаз 4–6)

Первый реальный package-shipped Controller. Растворяет `apps/ui-creator/src/editor/`.

**`Controllers.Editor` (из `@capsuletech/web-ui-creator/controllers`) — `store.ctx`:**
```
tree: IEditorTree          // единственный источник правды
selectedId: NodeId | null
dragSpec: DragSpec | null  // что тащим (drag-фаза)
dropTargetId: NodeId | null
intent: DropIntent | null  // резолвнутая точка вставки
marks: Record<NodeId, string>
```

**Handlers (HCA-события через meta-bound emit / `useEmit`):**
```
onSelect   payload: nodeId|null           → toggle selectedId
onDragOver payload: { spec, pointer }      → canvasIntent/treeIntent → set dragSpec/dropTargetId/intent
onDrop     payload: { spec, intent }       → applyDrop → set tree; clear drag
onDragEnd                                  → clear dragSpec/dropTargetId/intent
onMark     payload: { nodeId, color|null } → setMark
```

**Раскладка слоёв (что куда из `editor/`):**

| Из app `editor/` | Куда |
|---|---|
| `store.tsx` (state+mutations) | `web-ui-creator/controllers` → `EditorController` |
| `dnd.ts` (dragSpec/canInto/applyDrop/canvasIntent/treeIntent) | `web-ui-creator/state` (рядом с addNode/moveNode) |
| `rules.ts` (canDropInto/canMoveInto/acceptsChildren) | `web-ui-creator/manifests` |
| `seeds/` | app **Entity** (tree-фикстура) |
| overlay-chrome (box-shadow/z-index/marks из `canvas.tsx`) | `web-ui-creator/controllers` → `EditorOverlay` (читает `useCtx().store.ctx`, рисует chrome + эмитит `onSelect`) |
| meta-aware droppable/draggable | `web-dnd/controllers` (эмитят `onDragOver`/`onDrop`/`onDragEnd`) |

**Регистрация:** `web-ui-creator/capsule` манифест (ADR 033) — `defineCapsuleModule({ name: 'Editor', components: { Overlay: EditorOverlay }, controllers: { Editor: EditorController } })`. App: `packages: ['@capsuletech/web-ui-creator']` → `Editor.Overlay` + `Controllers.Editor` глобалятся. App-виджеты (canvas/tree/palette/inspector) — тонкая композиция, читают `useCtx().store.ctx`, ноль resolver/getBoundingClientRect. `Renderer` app пока импортит напрямую (его регистрация как `Renderer.*` — опционально, позже).

Связанные: ADR 008 (hybrid FSM + direct next), ADR 009 (hardcoded EVENT_HANDLERS), ADR 031 (renderer editOverlay), ADR 033 (регистрация пакетов).
