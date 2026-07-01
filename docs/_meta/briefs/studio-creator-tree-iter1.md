# Brief — owner-studio: creator iter 1 (единый document-flow + tree-centric сборка, clicks)

> Запуск: `.\claude-scope.ps1 -Scope studio`. Зона — `packages/web/studio/` целиком.
> **Commit-only** (не push). Перед PR: `pnpm --filter @capsuletech/web-studio test` + typecheck + `biome check --write`.
> Architect (main) пушит/мержит после verify. USER верифицирует в браузере (:3050).

## 0. Канон этой итерации (читать первым)

**«UI is a Shadow».** Канвас — немая проекция схемы, read-only. Вся сборка / выбор / правка
композиции живёт в студии. Никакого overlay над iframe, никакого координатного drop поверх
канваса — отвергнуто осознанно (канвас = cross-origin remote iframe, pointer-DnD через
`elementFromPoint` границу не пересекает; и превью в host потянуло бы host-стили вместо канвасных).

**Один флоу, не два (мандат USER).** Отрисовка и структура для store-режима (палитра-превью) и
creator-режима (сборка) — **идентичны**. Достигается унификацией стора (см. §1). Канвас рисует
один document в обоих режимах; select компонента (пресет ИЛИ узел дерева) гонит один и тот же
rightbar-флоу (props / contract / readme по `node.type`).

**Tree-centric creator.** В creator отдельной колонки-палитры НЕТ. Поверхность редактирования —
**дерево** (`WebStudio.Tree`). Вставка компонента = клик по **мини-палитре внутри узла** (только
то, что узел может принять), а не таскание пресета через экран. DnD в iter 1 **не делаем** —
ядро работает на кликах. Reorder-DnD внутри дерева = iter 2.

## 1. Ключевой сдвиг — слить `selection.ts` + `composition.ts` в один document-store

Сейчас два стора делают одно и то же (editable `ISchema` + нодовые ops), что и порождает «два
флоу». `composition.ts` сам это признаёт в шапке («Когда-нибудь объединим»). Итерация — тот момент.

**Единый стор** (предлагаю `src/document.ts` / `useDocument()`; имя на усмотрение owner, но стор
ОДИН). Абсорбирует обе роли:

```
state:  { schema: ISchema; selectedNodeId: string | null }
        // initial = пустой корневой ui.Flex (как composition.initialSchema),
        // COMPOSITION_ROOT_ID сохраняем стабильным.

ops:
  loadPreset(preset)               // store-mode: document := structuredClone(preset.schema),
                                   //   selectedNodeId := root. (был selection.setSelected)
  insertPreset(preset, parentId = ROOT)  // creator: клон нод с remap id → append в parent.
                                   //   (был composition.insertPreset, + параметр parentId)
  selectNode(id | null)            // (был composition.selectNode)
  patchProps(nodeId, props)        // per-key granular set (дословно из selection.ts)
  patchNodeType(nodeId, type)      // (дословно из selection.ts — icon-picker)
  removeNode(id)                   // нода + поддерево, root неудаляем (из composition.ts)
  reset()

selectors:
  schema(): ISchema
  selectedNodeId(): string | null
  selectedNode(): IEditorNode | null   // резолв nodes[selectedNodeId] — НОВОЕ, нужен rightbar'у
```

Семантика режимов над одним стором:
- **store-mode**: клик пресета в палитре → `loadPreset` (document = единственный пресет, root
  выбран). Смена пресета = replace. Поведение визуально как сегодня, но через общий стор.
- **creator-mode**: `insertPreset(preset, nodeId)` инкрементально; `selectNode` по клику строки.

`patchProps`/`patchNodeType` в `selection.ts` УЖЕ по-нодные и granular (per-key set сохраняет
фокус input'а, Renderer ре-эвалюэйтит thunk на конкретный prop без re-mount) — переносим как есть.

`insertPreset` clone+remap-id логика в `composition.ts:65-101` готова; добавить только `parentId`:
корень пресета цепляется к `parentId` (дефолт `COMPOSITION_ROOT_ID`) вместо жёсткого root.

Старые `selection.ts` / `composition.ts` — удалить (или оставить тонким re-export на переходный
период, если так проще рефакторить консумеров; в PR должен остаться ОДИН стор).

## 2. Rightbar — обобщить на выбранный УЗЕЛ (один флоу)

`PropsPanel` (`inspector/PropsPanel.tsx`) и `InfoPanel` (`info/InfoPanel.tsx`) сейчас берут
**корневую** ноду пресета из `selection`. Переключить на **`selectedNode()`** единого стора:

- **PropsPanel**: `rootNode()` → `selectedNode()`. Вся остальная логика (categories из
  `manifest.propsSchema`, `applyFieldRule`, icon-picker по child `ui.Icons.*`, `patchProps`/
  `patchNodeType`, memo-стабильность categories) остаётся — она уже нодо-центрична, просто про
  «корень пресета», а станет про «любой выбранный узел». fallback-текст «Выберите пресет…» →
  «Выберите компонент».
- **InfoPanel**: `selected()`/`rootType()` → `selectedNode()` + `selectedNode().type`;
  `getManifest`/`getContract` по этому типу. `EmptyState` когда `selectedNode() == null`.
- Оба работают идентично в store и creator — это и есть «мехи летят в одном флоу при select».

`Inspector` (`inspector/Inspector.tsx`) и `Info` + блоки (`info/*Block.tsx`) — **stateless,
переиспользуются как есть**, не трогаем.

## 3. Мини-палитра в узле дерева (creator, вставка кликом)

В `tree/TreeRow.tsx` (или отдельный `tree/NodePalette.tsx`) для узлов-**контейнеров** добавить
affordance «＋ добавить» → мини-палитра пресетов. Клик по пресету → `insertPreset(preset,
nodeId)` (вставка ребёнком именно в этот узел). Пустое дерево = мини-палитра на корневом Flex.

Мини-палитра переиспользует preset-рендер палитры (`getPresets`/`hasPresets` из
`@capsuletech/web-ui/manifest`) — палитра как модуль НЕ выбрасывается, её логика релоцируется в узел.

### ⚠️ Один открытый seam (согласовать с USER/architect до имплементации)
Гейт «узел — контейнер / что он принимает» упирается в **отсутствие containment-метадаты на
манифесте** (это отложенная задача owner-web-ui: `accepts: string[]`, см. §6). На iter 1 —
**временный** предикат `acceptsChildren(node)`:
- iter 1: корневой Flex + известные layout/composition-контейнеры (Flex/Grid/Group/List/Card/Field)
  принимают ВСЕ пресеты; leaf (Button/Label/…) — без мини-палитры.
- Пометить `// TODO(accept-policy)` со ссылкой на §6 — это осознанный iteration-seam, не канон.
  Не размазывать хардкод-список по коду: один helper, одно место.

Если owner видит чистый сигнал контейнерности уже сегодня (без новой метадаты) — использовать его
и сказать architect'у. Иначе — helper + TODO, заменяется accept-policy в следующей фазе.

## 4. Канвас — mode-agnostic проекция document

`providers/CanvasBinding.tsx`: `createEffect` уже зеркалит `selectedSchema()` → dispatch
`setComposition`. Переключить источник на **`document.schema()`** (весь собранный document, не
одиночный пресет). Один эффект, без ветвления по mode. JSON-снимок для postMessage-границы —
как есть (`JSON.parse(JSON.stringify(...))`). Пустой document (только root Flex) → канвас рисует
пустой контейнер (renderer-дефолт), это ок.

## 5. Creator layout (апп, зона architect — НЕ owner)

Раскладка creator без колонки-палитры (дерево — главная поверхность, rightbar = props+contract+
readme выбранного узла) живёт в **`apps/playground`** (`capsule.app.ts` / widgets studio). Это
**зона architect**, owner сюда НЕ лезет. Owner отдаёт зарегистрированные глобалы
(`WebStudio.Tree` уже есть; при необходимости — новый глобал мини-палитры), architect собирает
раскладку. Если owner'у для верификации нужен app-wiring — эскалировать architect'у, не править `apps/`.

## 6. Non-goals iter 1 (НЕ делать)

- **Reorder-DnD** внутри дерева (`createSortable`/`sortableZone` + `moveNode`) — iter 2.
- **`accepts: string[]` accept-policy** на манифестах (owner-web-ui, отдельный бриф) — заменит
  временный `acceptsChildren` из §3.
- **Save-composition-as-preset** + вкладка «кастомные композиции» в палитре — следующие итерации.
  Дизайн document-стора (§1) это НЕ должен запрещать: document = `ISchema` = preset.schema shape.
- Правки `apps/` (см. §5).

## 7. Acceptance

Unit (`packages/web/studio/src/**/__tests__`):
- Единый стор: `loadPreset` заменяет document + выбирает root; `insertPreset(preset, parentId)`
  вставляет в указанный узел (не только root) с уникальными id; `patchProps`/`patchNodeType`
  granular; `removeNode` сносит поддерево + сбрасывает selection если попал в ветку; `selectedNode()`
  резолвит выбранный узел.
- PropsPanel/InfoPanel: рендерят по `selectedNode()`, пустой стейт при `null`, реагируют на смену
  selectedNodeId.
- Мини-палитра: контейнер даёт пресеты + клик → `insertPreset(…, nodeId)`; leaf — без палитры.
- Существующие тесты (`palette`, `styles`, `tree`) — зелёные после рефактора привязок.

Browser e2e (USER, :3050):
- **store-mode** `/workspace/web-studio/store`: клик пресета → канвас рисует + rightbar показывает
  props/contract/readme — как раньше, регрессий нет.
- **creator-mode** `/workspace/web-studio/creator`: клик мини-палитры в узле → канвас дорисовывает
  компонент; клик узла дерева → rightbar показывает его props/contract/readme; правка prop →
  канвас обновляется.

## 8. Где что лежит (карта)

- Сторы: `src/selection.ts`, `src/composition.ts` → слить в `src/document.ts` (§1).
- Дерево: `src/tree/{Tree,TreePanel,TreeRow,Row,RowLabel}.tsx` (`TreePanel` читает стор).
- Rightbar: `src/inspector/{PropsPanel,Inspector,zod-to-categories,kit}.tsx`,
  `src/info/{InfoPanel,Info,*Block}.tsx`.
- Канвас-связка: `src/providers/CanvasBinding.tsx`.
- Регистрация: `src/capsule.ts` (`WebStudio.*`).
- Режим: `src/navigation/useStudioMode.ts` (`'store' | 'creator'`, URL-derived).
- Резолв пресета в канвасе: renderer `{ui:Ui}`, типы нод = dot-path (`ui.Card.Header` → `Ui.Card.Header`).

## 9. Durable (для памяти проекта)
Унификация selection+composition → document-store — это фундамент «одного флоу». Store-mode =
document из одного пресета; creator = многокорневой document; custom-comp = «сохранить document
как пресет». Все три — виды над одной моделью. Канвас всегда рисует document; rightbar всегда
по `selectedNode()`. Режим — только authoring-поверхность.
