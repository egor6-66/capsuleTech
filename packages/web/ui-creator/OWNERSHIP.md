# OWNERSHIP — @capsuletech/web-ui-creator

**Owner agent:** `owner-web-ui-creator`
**Package path:** `packages/web/ui-creator/`
**Release group:** `web_base` (tag `web@{version}`)

## Зона ответственности

Design-time toolkit для построения JSON-деревьев UI:
- **Манифесты** компонентов (спецификации, DnD-правила);
- **State-операции** над editing tree (pure functions, immutable);
- **DnD resolver'ы** (drag-spec, intent, applyDrop — framework-agnostic);
- **Inspector** — generic UI-form по manifest (design-time only);
- **Generators** — procedural/seeded генераторы UI-деревьев.

**ADR 032 фаза 5 (часть 2):** `/controllers` + `/capsule` добавлены. `/controllers` единственный subpath с `web-core`-зависимостью (EditorController + EditorOverlay). Остальное — framework-agnostic.

## Публичный API (subpaths)

### `@capsuletech/web-ui-creator/manifests`

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
| `type IComponentManifest` | Спецификация компонента |
| `type IManifestSummary` | Лёгкая сводка |

### `@capsuletech/web-ui-creator/state`

| Экспорт | Описание |
|---|---|
| `addNode(tree, payload)` | Добавить ноду |
| `moveNode(tree, payload)` | Переместить ноду |
| `removeNode(tree, payload)` | Удалить ноду и subtree |
| `updateNode(tree, payload)` | Patch props/meta/styles |
| `reorderChildren(tree, payload)` | Переупорядочить детей |
| `insertSubtree(tree, fragment, payload)` | Вставить фрагмент с ремапом id |
| `createEmptyTree(rootType?)` | Пустое дерево |
| `createEditorSchema(options?)` | XState-совместимая схема |
| `generateId()` | Уникальный NodeId |
| `ROOT_ID` | Константа id корня |
| `EditorOpError` | Ошибка операции |
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

### `@capsuletech/web-ui-creator/inspector`

`Inspector`, `type InspectorProps` — design-time UI-form. Тянет web-style/web-ui; НЕ для prod-bundles.

### `@capsuletech/web-ui-creator/generators`

`generate`, `FORM_PRESET`, `CARD_PRODUCT_PRESET`, `LAYOUT_2COL_PRESET`, `BUTTON_PRIMARY_PRESET`, `TYPOGRAPHY_PRESET`, `createRng`, `buildTemplate`, `type IPreset`, `type IGeneratorOptions`.

### `@capsuletech/web-ui-creator/controllers` (ADR 032, фаза 5)

HCA-integration subpath. Зависит на `@capsuletech/web-core`.

| Экспорт | Описание |
|---|---|
| `EditorController` | Package-shipped HCA-Controller: tree/selection/drag/marks state + handlers |
| `EditorOverlay` | Edit-decoration компонент для `<Renderer editOverlay={...} />` |
| `type IEditorCtx` | Shape store.ctx: tree, selectedId, dragSpec, dropTargetId, intent, marks |
| `type IOnDragOverCanvasPayload` | Payload для `onCanvasDragOver` |
| `type IOnDragOverTreePayload` | Payload для `onTreeDragOver` |
| `type IOnDropPayload` | Payload для `onDrop` |
| `type IOnMarkPayload` | Payload для `onMark` |

**Handlers EditorController:**

| Handler | Payload | Описание |
|---|---|---|
| `onSelect` | `NodeId \| null` | Toggle selectedId (повторный клик → deselect) |
| `onCanvasDragOver` | `{ spec, pointer: {x,y} }` | canvasIntent → dragSpec/dropTargetId/intent |
| `onTreeDragOver` | `{ spec, targetId, zone }` | treeIntent → dragSpec/dropTargetId/intent |
| `onDrop` | `{ spec, intent }` | applyDrop → tree; clear drag |
| `onDragEnd` | — | clear dragSpec/dropTargetId/intent |
| `onMark` | `{ nodeId, color\|null }` | set/unset цветную метку |
| `onSetTree` | `IEditorTree` | принудительная замена всего дерева |
| `canInto` | `{ spec, parentId }` | pure-read: возвращает boolean, не мутирует |

**Различение canvas vs tree surface:** разные handler-имена (`onCanvasDragOver` / `onTreeDragOver`). App-виджеты — тонкие (только emit с payload), resolver-логика в Controller.

### `@capsuletech/web-ui-creator/capsule` (ADR 033)

`defineCapsuleModule({ name: 'Editor', components: { Overlay: EditorOverlay }, controllers: { Editor: EditorController } })`

Регистрация в app: `packages: ['@capsuletech/web-ui-creator']` в `capsule.app.ts`.
После регистрации доступны: `Editor.Overlay` (компонент), `Controllers.Editor` (HCA-Controller).

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
| `controllers/__tests__/EditorController.test.ts` | onSelect toggle, onDrop mutates tree, onMark set/unset, onDragEnd clear, drag-cycle |
| `controllers/__tests__/EditorOverlay.test.tsx` | chrome по ctx, emit onSelect на клик, pointer-events drag, линия вставки, цветная метка |

## Roadmap

- [x] `docs/_meta/web-ui-creator.md` AI-anchor
- [x] `/controllers` subpath → `EditorController` (ADR 032 фаза 5, часть 2)
- [x] `/capsule` манифест (ADR 033)
- [ ] App-миграция: удалить `apps/ui-creator/src/editor/`, переписать виджеты на `Controllers.Editor` + `useCtx` (ADR 032 фаза 6)
- [ ] Undo/redo для state (command pattern)
- [ ] Manifest field-types: color, file, date
- [ ] Schema validation для tree через manifests
- [ ] Generator presets: navigation
