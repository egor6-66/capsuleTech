---
title: WebStudio.Builder — revive composition engine как product-block (без нового пакета)
status: draft (план, обсуждение продолжим позже)
audience: architect (self) → потом возможно owner-web-studio
last_updated: 2026-06-19
---

# Контекст

В #370 (commit `02274da8`, 2026-06-16) массово снесли композиционный engine студии (Tree + Palette-DnD + Overlay + Controller + Provider). Аргумент PR'а — «raw-engine subpaths… quick-and-dirty re-exports of internals». Замысел был — заменить product-block'ами.

Сейчас в studio есть `WebStudio.Canvas` / `WebStudio.Props` / `WebStudio.Info` / `WebStudio.ComponentsPalette` (без DnD, click-to-select), но **нет surface для сборки** — юзер в `apps/playground/src/pages/workspace/web-studio/creator.tsx` не может drag'ом из палитры в дерево собирать композицию.

## Решение (обсудили 2026-06-19)

**Не плодим новый пакет.** Restore'им код, но кладём под приватные internals + один новый public product-block `WebStudio.Builder`.

Обоснование: канон `feedback_studio_composition_rule` говорит «studio экспортит product-blocks, не raw engines». Нарушение #370 было именно в **публичности** subpath'ов `/controllers/tree`, `/controllers/palette` etc. Если те же модули — приватны, а наружу торчит композит-surface — это уже канон.

Новый пакет (`@capsuletech/component-builder` и т.п.) имеет смысл только когда engine нужен **снаружи** studio. Сейчас единственный потребитель — studio сама, значит overkill (см. §0.1: scope = форма изменения).

# Точка восстановления

```
parent (last living state): e6316ec0
deletion commit:            02274da8 (#370)
```

`git show e6316ec0:packages/web/studio/src/controllers/<path>` — для чтения отдельных файлов без checkout.

# Целевая структура

```
packages/web/studio/src/
├── controllers/
│   ├── WebStudioBuilder.tsx           ← NEW: единственная public-точка композиции
│   │                                     композит из internals ниже
│   ├── WebStudioCanvas.tsx            ← public (есть)
│   ├── WebStudioProps.tsx             ← public (есть)
│   ├── WebStudioInfo.tsx              ← public (есть)
│   ├── WebStudioCanvasStyle.tsx       ← public (есть)
│   └── builder/                       ← NEW: private internals (НЕ в exports)
│       ├── tree/
│       │   ├── Row.tsx                ← restore из e6316ec0 (269 строк)
│       │   ├── zones.ts               ← restore (pure-функции drop-зон, EDGE=6px)
│       │   ├── highlight.ts           ← restore (inset box-shadow + color-mix)
│       │   ├── MarkPicker.tsx         ← restore
│       │   ├── utils.ts               ← restore
│       │   └── index.ts
│       ├── palette/                   ← (palette-DnD, не путать с public ComponentsPalette)
│       │   ├── Item.tsx               ← createDraggable per-component
│       │   ├── ContainerItem.tsx
│       │   ├── Leaf.tsx
│       │   ├── TemplateCard.tsx
│       │   ├── TemplatesTrigger.tsx
│       │   ├── meta.ts
│       │   └── index.ts
│       ├── overlay/
│       │   └── WebStudioOverlay.tsx   ← DragOverlay ghost-под-курсором
│       ├── provider/
│       │   └── WebStudioProvider.tsx  ← монтирует DnDProvider + KitContext
│       ├── controller/
│       │   └── WebStudioController.tsx ← FSM selection/intent/tree-mutations
│       └── useWebStudio.ts            ← composition hook (tree, marks, intent, ...)
└── state/
    └── dnd.ts                         ← NEW (restore): DragSpec, TreeZone,
                                          canBeside, canInto, dragSpec
                                          domain-rules вложенности
```

**package.json#exports** — без новых subpath'ов. Только `WebStudio.Builder` через основной `index.ts`.

# Public API (черновик)

```tsx
// apps/playground/src/pages/workspace/web-studio/creator.tsx
const CreatorPage = Page((Ui) => (
  <WebStudio.Builder
    kit={Ui.ui}                    // content-kit (то ИЗ ЧЕГО юзер строит)
    schema={schema()}              // ISchema из selection store
    onChange={setSchema}
    showOverlay                    // default true — ghost под курсором
  >
    <WebStudio.Builder.Palette />  // drag-source
    <WebStudio.Builder.Tree />     // drop-targets + selection
    <WebStudio.Builder.Canvas />   // preview (тот же WebStudio.Canvas)
  </WebStudio.Builder>
));
```

Или без compound — composite-only `<WebStudio.Builder kit={...} schema={...} onChange={...} />` рендерит трёхколонный layout сам. Решить при импле.

# Engine cheat-sheet (что уже знаем)

**DnD pipeline:**
```
Palette.Item: createDraggable({ data: { source:'palette', type } })
        ↓ drag
Tree.Row:
  createDroppable(boxDrop) — для контейнеров (into/before/after)
  createDroppable(leafDrop) — для листьев (before/after)
        ↓ drop
emit('onDrop', { spec, intent }) → Controllers.WebStudio FSM
        ↓
ed.tree mutation → reactive Canvas + Tree re-render
```

**Резолв зон** (pure, без DOM): `containerZone(tree, spec, nodeId, clientY, headerTop, boxBottom)` → `'before'|'after'|'inside'|null`. EDGE=6px.

**Подсветка** (без border/outline, не двигает layout): `box-shadow: inset 0 0 0 Npx ...` + `background: color-mix(in srgb, ... pct%, transparent)`.

**Domain rules** (`state/dnd.ts`): `canBeside`/`canInto`/`acceptsChildren` — частично пересекаются с уже существующим в kit (`manifest.accepts`, `manifest.isLeaf`, `canAcceptChild` из `@capsuletech/web-ui/manifest`). При revive **проверить дедуп** — не дублировать правила, читать из kit-helper'а где возможно.

# Скоп revive (когда вернёмся)

1. Restore `state/dnd.ts` + проверить дедуп с kit `canAcceptChild`. Возможно сокращение.
2. Restore `controllers/builder/{tree,palette,overlay,provider,controller}/` под privacy.
3. Создать `WebStudioBuilder.tsx` — composite product-block.
4. Wire into `capsule.ts` (defineCapsuleModule).
5. Consumer на playground: `creator.tsx` → `<WebStudio.Builder ...>`.
6. Тесты (restore часть из e6316ec0, обновить под новый surface).
7. **НЕ** добавлять subpath'ы в `package.json#exports` для builder/-internals.
8. README + docs.

# Зависимости / блокеры

- **Параллельно идёт Input-эталон + form-family split** (бриф `input-etalon-and-form-family-split.md`) — owner-web-ui. Не пересекается с web-studio файлами, конфликтов быть не должно. Стартуем revive ПОСЛЕ закрытия Input'а чтобы не мешать рекомбинацией.
- web-dnd живой, kit-manifest даёт `accepts`/`isLeaf`/`canAcceptChild` — фундамент есть.
- `selection.ts` (single-selection store) уже есть в studio — переиспользуем.

# Связанное

- `e6316ec0` — last living state composition engine (`git show e6316ec0:packages/web/studio/src/controllers/<file>`).
- `02274da8` (#370) — commit где снесли.
- `apps/playground/src/pages/workspace/web-studio/creator.tsx` — целевой consumer на playground.
- `packages/web/dnd/` — `@capsuletech/web-dnd` (createDraggable/createDroppable/DnDProvider/DragOverlay).
- `packages/web/kit/ui/src/manifest/registry.ts` — `canAcceptChild`/`getManifest` (kit domain-rules).
- `packages/web/studio/src/selection.ts` — current selection store.
- `packages/web/studio/src/palette/ComponentsPalette.tsx` — текущая палитра БЕЗ DnD (click-to-select). Возможно поглотится Builder.Palette при revive, либо останется параллельно как «browse mode».
- memory `feedback_studio_composition_rule` — «product-blocks, NOT raw engines».
- memory `feedback_canon_modules_no_crutches` — PRIORITY 0 §0.
- memory `feedback_git_scope_by_change_shape` — §0.1 (scope = форма изменения, не догма).
- `docs/_meta/briefs/palette-button-etalon-audit.md` — родительский audit-thread.

# Open вопросы (на «потом»)

1. Compound API (`<Builder><Palette/><Tree/><Canvas/></Builder>`) или composite-only (`<Builder kit schema onChange />`)? Решить при импле — compound гибче, composite проще.
2. `WebStudio.ComponentsPalette` (click-to-select, есть сейчас) vs новый `Builder.Palette` (drag-source) — оставлять оба или сливать? Если drag-source умеет также click-to-select — слияние оправдано.
3. `MarkPicker` (цветные метки нод) — сохранять или дропать как фичу. По смыслу — debugging affordance, не core.
4. Schema mutation logic — где живёт? В `state/dnd.ts` (как было) или в Controllers.WebStudio FSM (как должно быть по HCA)? Скорее второе.
