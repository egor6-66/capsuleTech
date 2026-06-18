---
name: "@capsuletech/web-studio"
owner-agent: owner-studio
group: web_base
zone: studio
status: alpha
priority: P1
last-updated: 2026-06-12
---

# OWNERSHIP — @capsuletech/web-studio

**Owner agent:** `owner-studio`
**Package path:** `packages/web/studio/`
**Release group:** `web_base` (tag `web@{version}`)

## Состояние (читать ПЕРВЫМ)

- **Zone:** `studio` (5-я zone, host/composer per ADR 047 D6, 2026-06-12). Studio — единственный пакет в зоне; зона существует как top-level slot для host/composer-инструмента.
- **Status:** `alpha` (0.1.1) — manifests/state/inspector/generators работают; controllers subpath добавлен.
- **Priority:** **P1** — единственный design-time host; активная разработка ожидается на следующих этапах.
- **Composition rule (canon):** Studio exports **product-blocks** (`logic-editor`, `component-builder`, `inspector-panel`, …), НЕ raw functionality. Raw engines (universal generators, manifest registry, JSON-tree ops) при необходимости extract'ятся в свои пакеты и юзаются и в studio, и в apps. См. [[studio-composition-rule]].
- **Audit-backlog (текущий внутренний layout — quick-and-dirty, ожидает rework):**
  - `/generators` — universal data-gen engine, должен быть extract'нут в свой пакет (нужен также apps и test-стендам).
  - `/manifests` — дублирует manifests в `@capsuletech/web-ui` (kit). Consolidate в kit как single source.
  - `/state`, `/inspector` — TBD при аудите (product-block vs raw extract).
- **Last activity:** 2026-06-12 (zone-flatten + canon refresh).

## Vendor stack (ADR 047 D3)

- **Solid.js** (`solid-js` `^1.9.12`, peerDep) — реактивный фреймворк. https://docs.solidjs.com/
- **`@capsuletech/web-core`** (workspace, dep) — HCA wrappers; `/controllers` subpath единственный с этой зависимостью (WebStudioController).
- **`@capsuletech/web-ui`** (workspace, dep) — chrome редактора.
- **`@capsuletech/web-dnd`** (workspace, dep) — pointer DnD для палитры/tree.
- **`@capsuletech/web-renderer`** (workspace, peerDep) — preview JSON-схемы.
- **`@capsuletech/shared-zod`** (workspace, dep) — schema-validation для manifest'ов.

## Зона ответственности

Studio = host/composer (5-я zone). Текущий внутренний toolkit для построения JSON-деревьев UI:
- **Манифесты** компонентов (спецификации, DnD-правила);
- **State-операции** над editing tree (pure functions, immutable);
- **DnD resolver'ы** (drag-spec, intent, applyDrop — framework-agnostic);
- **Inspector** — generic UI-form по manifest (design-time only);
- **Generators** — procedural/seeded генераторы UI-деревьев.

**ADR 032 фаза 5 (часть 2):** `/controllers` + `/capsule` добавлены. `/controllers` единственный subpath с `web-core`-зависимостью (WebStudioController + WebStudioOverlay). Остальное — framework-agnostic.

## Два кита редактора (архитектурное правило)

Редактор работает с двумя независимыми наборами UI-компонентов:

### КОНТЕНТ-кит (`kit` prop → `useWebStudioKit()`)
Передаётся пропом в `<WebStudio.Provider kit={...}>`. Это компоненты, ИЗ которых пользователь строит свой UI. Используется:
- `WebStudioCanvas` — registry для `<Renderer>` (рендер Canvas-контента)
- `WebStudioPalette` — только для `<TemplateCard>` preview через `<Renderer>` (превью шаблонов)

Доступен через `useWebStudioKit()`. НЕ используется для chrome-элементов самого редактора.

### Chrome-кит (`@capsuletech/web-ui`, прямая зависимость пакета)
Фиксированный набор компонентов, КОТОРЫМИ нарисован сам редактор. Импортируются напрямую:
- `WebStudioTree` → `import { Dropdown } from '@capsuletech/web-ui/dropdown'` (метки узлов)
- `WebStudioPalette` → `import { Dropdown } from '@capsuletech/web-ui/dropdown'` (Dropdown шаблонов)
- `inspector/` → `import { Input } from '@capsuletech/web-ui/input'`, `Toggle` (поля формы)

**Правило для owner-agent:** chrome → `@capsuletech/web-ui` напрямую. `useWebStudioKit()` — только контент (Canvas render, Palette preview).

**GAP:** Inspector Select/Textarea — нативный fallback. Свапнуть на `web-ui` Select/Textarea отдельной задачей когда owner-web-ui добавит их.

## Публичный API (subpaths)

### `@capsuletech/web-studio/manifests`

| Экспорт | Описание |
|---|---|
| `getManifest(type)` | Резолв манифеста по dot-path типу |
| `getAllManifests()` | Все зарегистрированные манифесты |
| `listByCategory(cat)` | Манифесты конкретной категории |
| `canAcceptChild(parentType, childType)` | Базовая DnD-валидация через манифест |
| `summarize(m)` | Лёгкая сводка для палитры |
| `getCategories()` | Уникальные категории |
| `acceptsChildren(node)` | Может ли нода держать детей (не leaf, не string-children) |
| `canDropInto(parentType, childType)` | Drop-валидация с composite-строгостью |
| `isInside(tree, ancestorId, nodeId)` | Лежит ли nodeId внутри поддерева ancestorId |
| `canMoveInto(tree, dragId, targetId)` | Полная валидация move (не root, не в себя, не в потомков) |
| `type ComponentCategory` | Допустимые категории компонентов |
| `type IPrimitiveManifestEntry` | Спецификация компонента |
| `type IManifestSummary` | Лёгкая сводка |

### `@capsuletech/web-studio/state`

| Экспорт | Описание |
|---|---|
| `addNode(tree, payload)` | Добавить ноду |
| `moveNode(tree, payload)` | Переместить ноду |
| `removeNode(tree, payload)` | Удалить ноду и subtree |
| `updateNode(tree, payload)` | Patch props/meta/styles |
| `reorderChildren(tree, payload)` | Переупорядочить детей |
| `insertSubtree(tree, fragment, payload)` | Вставить фрагмент с ремапом id |
| `createEmptyTree(rootType?)` | Пустое дерево |
| `createWebStudioSchema(options?)` | XState-совместимая схема |
| `generateId()` | Уникальный NodeId |
| `ROOT_ID` | Константа id корня |
| `WebStudioOpError` | Ошибка операции |
| **DnD resolver'ы (ADR 032, фаза 5):** | |
| `dragSpec(data)` | Распознать DragSpec из raw payload web-dnd |
| `canInto(tree, spec, parentId)` | Можно ли вставить spec в parentId |
| `canBeside(tree, spec, siblingId)` | Можно ли вставить spec соседом siblingId |
| `applyDrop(tree, spec, intent)` | Применить drop (add/addTree/move) |
| `canvasIntent(tree, spec, x, y)` | Геометрический резолвер канваса (DOM) |
| `treeIntent(tree, spec, targetId, zone)` | Резолвер дерева по zone строки |
| `type DragSpec` | Что тащим: add / addTree / move |
| `type DropIntent` | Куда вставить: parentId + beforeId |
| `type TreeZone` | Зона строки дерева: before / after / inside |
| (+ все payload-типы) | IAddNodePayload, IMoveNodePayload, … |

### `@capsuletech/web-studio/inspector`

`Inspector`, `type InspectorProps` — studio-only UI-form (тулинг авторства). Тянет web-style/web-ui; НЕ для prod-bundles.

### `@capsuletech/web-studio/generators`

`generate`, `FORM_PRESET`, `CARD_PRODUCT_PRESET`, `LAYOUT_2COL_PRESET`, `BUTTON_PRIMARY_PRESET`, `TYPOGRAPHY_PRESET`, `createRng`, `buildTemplate`, `type IPreset`, `type IGeneratorOptions`.

### `@capsuletech/web-studio/controllers` (ADR 032, фаза 5)

HCA-integration subpath. Зависит на `@capsuletech/web-core`.

| Экспорт | Описание |
|---|---|
| `WebStudioController` | Package-shipped HCA-Controller: tree/selection/drag/marks state + handlers |
| `WebStudioOverlay` | Edit-decoration компонент для `<Renderer editOverlay={...} />` |
| `type IWebStudioCtx` | Shape store.ctx: tree, selectedId, dragSpec, dropTargetId, intent, marks |
| `type IOnDragOverCanvasPayload` | Payload для `onCanvasDragOver` |
| `type IOnDragOverTreePayload` | Payload для `onTreeDragOver` |
| `type IOnDropPayload` | Payload для `onDrop` |
| `type IOnMarkPayload` | Payload для `onMark` |

**Handlers WebStudioController:**

| Handler | Payload | Описание |
|---|---|---|
| `onSelect` | `NodeId \| null` | Toggle selectedId (повторный клик → deselect) |
| `onCanvasDragOver` | `{ spec, pointer: {x,y} }` | canvasIntent → dragSpec/dropTargetId/intent |
| `onTreeDragOver` | `{ spec, targetId, zone }` | treeIntent → dragSpec/dropTargetId/intent |
| `onDrop` | `{ spec, intent }` | applyDrop → tree; clear drag |
| `onDragEnd` | — | clear dragSpec/dropTargetId/intent |
| `onMark` | `{ nodeId, color\|null }` | set/unset цветную метку |
| `onSetTree` | `IWebStudioTree` | принудительная замена всего дерева |
| `canInto` | `{ spec, parentId }` | pure-read: возвращает boolean, не мутирует |

**Различение canvas vs tree surface:** разные handler-имена (`onCanvasDragOver` / `onTreeDragOver`). App-виджеты — тонкие (только emit с payload), resolver-логика в Controller.

### `@capsuletech/web-studio/capsule` (ADR 033)

`defineCapsuleModule({ name: 'WebStudio', components: { Overlay: WebStudioOverlay }, controllers: { Editor: WebStudioController } })`

Регистрация в app: `packages: ['@capsuletech/web-studio']` в `capsule.app.ts`.
После регистрации доступны: `WebStudio.Overlay` (компонент), `Controllers.WebStudio` (HCA-Controller).

## Известные ограничения / quirks

1. **Multi-entry vite build** — все subpaths обязаны присутствовать в dist.
2. **`/inspector` тянет UI-зависимости** — не импортировать в prod-app.
3. **`/generators` — детерминизм через seed** — mulberry32 RNG, никакого `Math.random`.
4. **`canvasIntent`/`treeIntent` используют DOM** — framework-agnostic (DOM, не web-core). Тесты через jsdom с моком `elementFromPoint`.
5. **`rules.ts` — composite-строгость**: composite-части (Card.Header и т.п.) принимаются только контейнером с явным `accepts` — иначе могут потеряться в чужом дереве.

## Тест-покрытие

| Файл | Что покрыто |
|---|---|
| `state/__tests__/insert-subtree.test.ts` | insertSubtree: вставка, ремап id, orphan-check, ошибки |
| `state/__tests__/dnd.test.ts` | dragSpec, canInto, canBeside, applyDrop (all 3 kinds), treeIntent, canvasIntent |
| `manifests/__tests__/rules.test.ts` | acceptsChildren, canDropInto, isInside, canMoveInto |
| `generators/__tests__/` | engine, form, fuzzer, rng, templates |
| `controllers/__tests__/WebStudioController.test.ts` | onSelect toggle, onDrop mutates tree, onMark set/unset, onDragEnd clear, drag-cycle |
| `controllers/__tests__/WebStudioOverlay.test.tsx` | chrome по ctx, emit onSelect на клик, pointer-events drag, линия вставки, цветная метка |

## Roadmap

- [x] `docs/_meta/studio.md` AI-anchor
- [x] `/controllers` subpath → `WebStudioController` (ADR 032 фаза 5, часть 2)
- [x] `/capsule` манифест (ADR 033)
- [ ] App-миграция: удалить `apps/ui-creator/src/editor/`, переписать виджеты на `Controllers.WebStudio` + `useCtx` (ADR 032 фаза 6)
- [ ] Undo/redo для state (command pattern)
- [ ] Manifest field-types: color, file, date
- [ ] Schema validation для tree через manifests
- [ ] Generator presets: navigation
