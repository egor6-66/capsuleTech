---
tags: [meta, web-ui-creator, ai-context]
status: documented
type: ai-anchor
audience: claude
---

# @capsuletech/web-ui-creator — AI context anchor

> Шпаргалка для Claude-инстансов. Без воды. Юзеру — `docs/09-packages/ui-creator.md`.

## TL;DR

Design-time toolkit: всё нужное чтобы СОЗДАТЬ JSON-дерево UI. Runtime-рендер — в `@capsuletech/web-renderer` (отдельный пакет, без deps на zod/manifests). Пакет framework-agnostic (ноль зависимости на web-core) — кроме `/controllers` (HCA-integration, ADR 032) и `/inspector` (Solid-UI, design-time only).

## Где что лежит

| Путь | Что |
|---|---|
| `src/manifests/registry.ts` | Реестр всех манифестов, `getManifest`, `canAcceptChild` |
| `src/manifests/types.ts` | `IComponentManifest`, `ComponentCategory` |
| `src/manifests/rules.ts` | `acceptsChildren`, `canDropInto`, `isInside`, `canMoveInto` — редакторские DnD-правила |
| `src/manifests/manifests/` | Манифесты отдельных компонентов (card, field, layout, …) |
| `src/state/types.ts` | `IEditorTree`, `IEditorNode`, `NodeId`, payload-типы |
| `src/state/operations.ts` | `addNode`, `moveNode`, `removeNode`, `updateNode`, `reorderChildren`, `insertSubtree`, `createEmptyTree` |
| `src/state/dnd.ts` | DnD resolver'ы: `DragSpec`, `DropIntent`, `TreeZone`, `dragSpec`, `canInto`, `canBeside`, `applyDrop`, `canvasIntent`, `treeIntent` |
| `src/state/ids.ts` | `generateId`, `ROOT_ID` |
| `src/state/schema.ts` | `createEditorSchema` — XState-совместимая схема |
| `src/inspector/Inspector.tsx` | Generic inspector form по manifest |
| `src/generators/engine.ts` | `generate(preset, opts)` → `IEditorTree` |
| `src/generators/presets/` | `FORM_PRESET`, `CARD_PRODUCT_PRESET`, `LAYOUT_2COL_PRESET`, `BUTTON_PRIMARY_PRESET`, `TYPOGRAPHY_PRESET` |
| `src/generators/rng.ts` | `createRng(seed)` — mulberry32, детерминированный |
| `src/generators/fuzzer.ts` | Zod-aware fuzzer для заполнения props |
| `src/generators/templates.ts` | `buildTemplate` — material preset → IEditorTree |
| `src/controllers/EditorController.tsx` | HCA-Controller: tree/selection/drag/marks + handlers (ADR 032, фаза 5) |
| `src/controllers/EditorOverlay.tsx` | Edit-decoration компонент для Renderer.editOverlay (ADR 031/032) |
| `src/controllers/index.ts` | Barrel `/controllers` subpath |
| `src/capsule.ts` | `/capsule` манифест — `defineCapsuleModule` (ADR 033) |

## Subpath exports

```ts
// @capsuletech/web-ui-creator/manifests — спецификации + правила
import { getManifest, canAcceptChild, canDropInto, canMoveInto, isInside, acceptsChildren }
  from '@capsuletech/web-ui-creator/manifests';

// @capsuletech/web-ui-creator/state — операции + DnD resolver'ы
import { addNode, moveNode, applyDrop, canInto, treeIntent, canvasIntent, dragSpec }
  from '@capsuletech/web-ui-creator/state';
import type { DragSpec, DropIntent, TreeZone }
  from '@capsuletech/web-ui-creator/state';

// @capsuletech/web-ui-creator/inspector — form (design-time only)
import { Inspector } from '@capsuletech/web-ui-creator/inspector';

// @capsuletech/web-ui-creator/generators — procedural generation
import { generate, FORM_PRESET, createRng } from '@capsuletech/web-ui-creator/generators';

// @capsuletech/web-ui-creator/controllers — HCA-integration (тянет web-core)
import { EditorController, EditorOverlay } from '@capsuletech/web-ui-creator/controllers';
import type { IEditorCtx } from '@capsuletech/web-ui-creator/controllers';

// @capsuletech/web-ui-creator/capsule — манифест для capsule.app.ts
// (обычно не импортируется напрямую — читается Vite-плагином)
import capsuleManifest from '@capsuletech/web-ui-creator/capsule';
```

## DnD-архитектура (ADR 032, фаза 5)

**Слои DnD-валидации:**

```
manifest.isLeaf / manifest.accepts
       ↓
canAcceptChild(parentType, childType)    ← базовая валидация из registry
       ↓
canDropInto(parentType, childType)       ← добавляет composite-строгость
       ↓
canMoveInto(tree, dragId, targetId)      ← добавляет: не root, не в себя, не в потомков
       ↓
canInto(tree, spec, parentId)            ← единый фасад для DragSpec (add/addTree/move)
```

**composite-строгость** в `canDropInto`: если `childType` имеет `category='composite'` — пускаем ТОЛЬКО в контейнер с явным `accepts(childType) === true`. Иначе Card.Header мог бы улететь в произвольный Flex.

**`canvasIntent`** использует `document.elementFromPoint` + `getBoundingClientRect` — DOM, не web-core. Тесты через jsdom с моком `elementFromPoint`.

**`applyDrop`** — единственная точка мутации дерева при drag: оборачивает `addNode`/`insertSubtree`/`moveNode`, ловит ошибки (возвращает исходное дерево при fail).

## EditorController-контракт (ADR 032, фаза 5)

**`store.ctx` (IEditorCtx):**
```
tree: IEditorTree          // единственный источник правды
selectedId: NodeId | null
dragSpec: DragSpec | null  // что тащим (drag-фаза)
dropTargetId: NodeId | null
intent: DropIntent | null  // резолвнутая точка вставки
marks: Record<NodeId, string>
```

**Handlers:**

| Handler | Payload | Действие |
|---|---|---|
| `onSelect` | `NodeId \| null` | toggle selectedId |
| `onCanvasDragOver` | `{ spec, pointer:{x,y} }` | canvasIntent → set dragSpec/dropTargetId/intent |
| `onTreeDragOver` | `{ spec, targetId, zone }` | treeIntent → set dragSpec/dropTargetId/intent |
| `onDrop` | `{ spec, intent }` | applyDrop → set tree; clear drag |
| `onDragEnd` | — | clear dragSpec/dropTargetId/intent |
| `onMark` | `{ nodeId, color\|null }` | set/unset цветную метку |
| `onSetTree` | `IEditorTree` | заменить дерево целиком |
| `canInto` | `{ spec, parentId }` | pure-read, returns boolean |

**Surface-разделение:** `onCanvasDragOver` (геометрия через pointer) vs `onTreeDragOver` (zone строки). Виджеты — только emit с payload, ноль resolver-логики в app.

**`EditorOverlay`** монтируется рендерером внутри бокса каждой ноды. Читает `useCtx().store.ctx`, рисует chrome (inset box-shadow, заливка, линия вставки). Эмитит `onSelect` через `useEmit`. Pointer-events:none во время drag.

**`/capsule` манифест:** `defineCapsuleModule({ name: 'Editor', components: { Overlay }, controllers: { Editor } })`.

## Известные ограничения

1. **Multi-entry vite build** — `vite.config.mts`: `index + manifests + state + inspector + generators + controllers + capsule`. Все subpaths обязаны присутствовать в `dist/`.
2. **`/inspector` тянет web-style/web-ui** — только editor-app, не prod.
3. **`/controllers` тянет web-core** — изолировано в subpath; generic-ядро (`src/index.ts`) web-core не импортирует.
4. **Детерминизм генераторов** — mulberry32 RNG. `Math.random` внутри engine/fuzzer запрещён.
5. **`canvasIntent` / `treeIntent` — DOM-зависимые** — framework-agnostic (DOM, не web-core). В тестах jsdom+mock.
6. **Tree shape ≠ Solid VNode** — `IEditorTree` это JSON-сериализуемая схема. `web-renderer` парсит в JSX.

## Gotchas

1. **composite vs composition** — `composition` = Card/Field (составной компонент-семейство), `composite` = Card.Header/Field.Label (части-слоты). `canDropInto` применяет строгость только к `composite`.
2. **`canAcceptChild` pass-through для неизвестных типов** — если parentType не в реестре → возвращает `true`. `canDropInto` наследует это поведение, но composite-check всё равно работает через childType.
3. **`applyDrop` silent fallback** — при ошибке возвращает исходное дерево (не бросает). Логировать ошибки на уровне EditorController (фаза 5, часть 2).
4. **`insertSubtree` ремапит все id фрагмента** — одна вставка одного шаблона дважды → нет коллизий id.
5. **`moveNode` с тем же родителем** — корректно обрабатывается (remove + insert в новую позицию).

## ADR-связи

- ADR 031 — renderer editOverlay (runtime-side; EditorOverlay реализует контракт IEditOverlayProps)
- ADR 032 — Package /controllers + useEmit; фаза 5 часть 1: `dnd.ts`+`rules.ts` → пакет; часть 2: EditorController + EditorOverlay + /controllers + /capsule
- ADR 033 — механизм регистрации пакетов; `/capsule` манифест реализован

## Тест-покрытие

| Suite | Тестов | Что |
|---|---|---|
| `state/__tests__/dnd.test.ts` | 34 | dragSpec, canInto/canBeside, applyDrop (add/addTree/move), treeIntent, canvasIntent |
| `manifests/__tests__/rules.test.ts` | 18 | acceptsChildren, canDropInto, isInside, canMoveInto |
| `state/__tests__/insert-subtree.test.ts` | 8 | insertSubtree |
| `generators/__tests__/` | 67 | engine, form, fuzzer, rng, templates |
| `controllers/__tests__/EditorController.test.ts` | 8 | onSelect toggle, onDrop tree, onMark set/unset, onDragEnd, drag-cycle |
| `controllers/__tests__/EditorOverlay.test.tsx` | 9 | chrome по ctx, emit onSelect, pointer-events, линия вставки, метка |
