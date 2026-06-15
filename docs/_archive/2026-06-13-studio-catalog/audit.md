# Studio docs audit — для архитектора

**Контекст.** Прошёл всю студийную доку (`packages/web/studio/OWNERSHIP.md`, `packages/web/studio/README.md`, `packages/web/studio/CHANGELOG.md`, `docs/_meta/studio.md`, `docs/_meta/web-zones/studio.md`, `docs/09-packages/studio.md`) и весь `packages/web/studio/src/`. Цель — найти расхождения между документацией и реальностью кода.

**Уже обсуждено с пользователем, фиксится отдельно (не дублируется ниже):**

- `/docs` subpath → пойдёт в отдельный пакет.
- Аудит manifests (per-component manifests живут в `@capsuletech/web-ui/manifest`, не в studio).
- OWNERSHIP.md устарел.
- `docs/09-packages/studio.md` устарел (старые пути `packages/web/ui-creator/...`, описан `src/manifests/manifests/*` которого нет).
- Composition-rule целевое (`/logic-editor`, `/component-builder`, `/inspector-panel`, …) — пока не реализовано.

---

## 1. `/generators` subpath после миграции на `@capsuletech/data-gen`

**Реальность кода** (`src/generators/index.ts` + `templates.ts`):

```ts
export { buildTemplate, getAllTemplates, listTemplatesFor, type ITemplate } from './templates';
```

Никакого `generate`, `createRng`, `FORM_PRESET`, `CARD_PRODUCT_PRESET`, `LAYOUT_2COL_PRESET`, `BUTTON_PRIMARY_PRESET`, `TYPOGRAPHY_PRESET`, `type IPreset`, `type IGeneratorOptions`, fuzzer'а, engine'а — всё уехало в `@capsuletech/data-gen`.

В studio осталась тонкая обёртка: «темплейт = data-gen preset + UI-метаданные (label, forType, group, previewSeed)». `buildTemplate` инжектит `getManifest` как `resolveManifest`, чтобы data-gen остался pure.

**Что говорит документация:**

| Источник | Что заявлено |
|---|---|
| `OWNERSHIP.md` | `/generators`: `generate`, `FORM_PRESET`, `CARD_PRODUCT_PRESET`, `LAYOUT_2COL_PRESET`, `BUTTON_PRIMARY_PRESET`, `TYPOGRAPHY_PRESET`, `createRng`, `buildTemplate`, `type IPreset`, `type IGeneratorOptions`. + Audit-backlog: «должен быть extract'нут в свой пакет». |
| `docs/_meta/studio.md` | Layout перечисляет `engine.ts`, `templates.ts`, `presets/`, `rng.ts`, `fuzzer.ts` — этих файлов нет. Subpath-секция импортирует `{ generate, FORM_PRESET, createRng }` из `@capsuletech/web-studio/generators` — не работает. |
| `README.md` | Импорт `import { generate, FORM_PRESET } from '@capsuletech/web-studio/generators'` — не работает. + «procedural/seeded генераторы UI-деревьев + presets» — на самом деле это палитра-темплейты, оборачивающие data-gen. |

**Действие.** Перечитать секции generators во всех трёх местах: они описывают пакет образца 0.2.0, до выноса data-gen.

---

## 2. `/controllers` subpath — публичный API шире документации в 6× раз

**Реальность кода** (`src/controllers/index.ts`):

```ts
// ComponentsPalette
EditorCanvas, EditorOverlay, EditorProvider, EditorTree, EditorPalette, EditorInspector
// Controller
EditorController (default), schemaToInspectorCategories
// Hooks
useEditor, useEditorKit
// Constants
CATEGORY_LABELS, CATEGORY_ORDER, CONTAINER_ORDER, catRank, orderRank
// Types
IEditorCtx, IEditorProviderProps, EditorKit, IUseEditorResult,
IOnDragOverCanvasPayload, IOnDragOverTreePayload, IOnDropPayload, IOnMarkPayload,
IOnUpdateNodePropsPayload  ← НОВЫЙ handler, нет в anchor handlers-таблице
```

**Что говорит документация:**

OWNERSHIP `/controllers` секция перечисляет только `EditorController`, `EditorOverlay`, `type IEditorCtx` и 4 payload-типа. AI-anchor — то же самое.

Handler `onUpdateNodeProps` (по `IOnUpdateNodePropsPayload`) **полностью отсутствует** в таблице handlers в обоих местах.

**Действие.** Subpath `/controllers` = полноценный product-block (UI-editor: Provider+Canvas+Tree+Palette+Inspector+Overlay), а не «HCA-adapter с двумя компонентами». Доку переписать под текущий surface, плюс добавить `onUpdateNodeProps` в таблицу handlers.

---

## 3. `/capsule` манифест регистрирует 6 компонентов

**Реальность кода** (`src/capsule.ts`):

```ts
defineCapsuleModule({
  name: 'Editor',
  components: { Overlay, Provider, Canvas, Tree, Palette, Inspector },
  controllers: { Editor: EditorController },
})
```

После регистрации в app доступны глобалы: `WebStudio.Overlay`, `WebStudio.Provider`, `WebStudio.Canvas`, `WebStudio.Tree`, `WebStudio.Palette`, `WebStudio.Inspector`, `Controllers.WebStudio`.

**Что говорит документация:**

OWNERSHIP / AI-anchor: только `WebStudio.Overlay` + `Controllers.WebStudio`.

> Примечание: я ранее задал вопрос про эти 5 компонентов, пользователь ответил «это не реализовано». Возможно имелось в виду композиционно-целевое (`/logic-editor`, `/component-builder`, …) — на текущий код это не отвечает: Provider/Canvas/Tree/Palette/Inspector реализованы и зарегистрированы. Это надо пересверить с архитектором.

---

## 4. Inspector kit-injection (`IInspectorKit` + `DEFAULT_KIT`)

**Реальность кода** (`src/inspector/index.ts` + `kit.tsx`):

```ts
export { DEFAULT_KIT } from './kit';
export type { IInspectorKit, ... } from './types';
```

`IInspectorKit` = `{ Input, Toggle, Select, Textarea }`. `DEFAULT_KIT` берёт реализации из `@capsuletech/web-ui/{input,toggle,select,textarea}`. Это extension-point: подменяется chrome полей инспектора.

**Что говорит документация.**

Нигде. Ни в OWNERSHIP, ни в AI-anchor, ни в user-doc, ни в README. Никакого упоминания kit-injection в Inspector'е.

**Связанный stale-факт.** AI-anchor `known-limits` пункт 7 — «Inspector Select/Textarea — нативный fallback ... Свапнем на web-ui компоненты отдельной задачей когда owner-web-ui добавит их. Fallback не трогать до этого момента» — устарело. Select и Textarea в web-ui уже есть, kit.tsx ими пользуется.

---

## 5. `/inspector` — публичный surface шире `Inspector` + `InspectorProps`

**Реальность кода** (`src/inspector/index.ts`):

```ts
Category, Inspector, renderField, parseUnit, formatUnit, DEFAULT_KIT,
type IParsedUnit, type IInspectorKit, type ICategory, type IInspectorProps,
type IFieldDef, type ITextField, type ITextareaField, type INumberField,
type INumberUnitField, type IBooleanField, type ISelectField,
type OnChangeFn, type ValuesMap
```

**Что говорит документация.**

OWNERSHIP `/inspector`: одна строка — «`Inspector`, `type InspectorProps` — studio-only UI-form». AI-anchor: одна строка в layout-таблице.

**Действие.** Раскрыть полный surface (поля discriminated union по `IFieldDef.type`, экспорт `Category` отдельным компонентом, `parseUnit`/`formatUnit`/`IParsedUnit` для number-unit полей).

---

## 6. `/state`: `createEditorSchema` + `ICreateEditorSchemaOptions`

**Реальность кода** (`src/state/index.ts`):

```ts
export { createEditorSchema } from './schema';
export type { ICreateEditorSchemaOptions } from './schema';
```

**Что говорит документация.**

OWNERSHIP: одна строка — «`createEditorSchema(options?)` — XState-совместимая схема». `ICreateEditorSchemaOptions` не упомянут. AI-anchor: в layout-таблице — «`createEditorSchema` — XState-совместимая схема». Сигнатура options, для чего нужна FSM-обёртка редактора, как использовать — нигде.

---

## 7. AI-anchor `Где что лежит` (layout-секция) не упоминает реальные подмодули

В AI-anchor отсутствуют пути:
- `src/controllers/palette/{ContainerItem,Item,Leaf,TemplateCard,TemplatesTrigger,meta}` — внутренняя композиция `EditorPalette`.
- `src/controllers/tree/{Row,MarkPicker,highlight,zones,utils}` — внутренняя композиция `EditorTree`.
- `src/controllers/{EditorProvider,EditorCanvas,EditorInspector,EditorPalette,EditorTree,useEditor}` — компоненты product-block'а UI-editor.
- `src/controllers/index.ts` — barrel-файл со всеми экспортами `/controllers`.
- `src/docs/*` — docs-консумер (даже если будет вынесен в отдельный пакет — на текущий момент он часть студии и в дисте лежит).
- `src/inspector/{kit.tsx,fields/*}` — kit-injection, дискриминированные field-варианты.

---

## 8. EditorProvider оборачивает в DnDProvider — инвариант не зафиксирован

**Реальность кода** (`EditorProvider.tsx` JSDoc):

> «Также монтирует `<DnDProvider>` — редактор владеет своим drag-and-drop, app-консумер про web-dnd знать не должен.»

Это важный инвариант изоляции: app-разработчику не нужно ставить `@capsuletech/web-dnd` в дерево вручную, editor-shell сам это делает.

**Что говорит документация.**

Только JSDoc внутри `EditorProvider.tsx`. В OWNERSHIP / AI-anchor / user-doc — нет.

---

## 9. `showDefaultOverlay` prop у `WebStudio.Provider`

**Реальность кода** (`IEditorProviderProps`):

```ts
showDefaultOverlay?: boolean;  // default true
```

Контролирует встроенный drag-overlay (ghost под курсором). Публичный API. В Markdown-документации не упомянут.

---

## 10. README `/controllers` строка не отражает реальный surface

**Сейчас в README:**

> `/controllers` — `EditorController` + `EditorOverlay` (единственный subpath с зависимостью на `web-core`).

Реально это полный product-block UI-editor'а — Provider/Canvas/Tree/Palette/Inspector + Overlay + Controller + хук useEditor + kit-context.

---

## 11. AI-anchor `known-limits` #7 устарел (Inspector fallback)

См. п.4 выше. Дублирую как отдельный пункт, потому что это явная фраза в `known-limits`, которую можно вычеркнуть.

---

## Что ОК и не требует правки

- `vendor stack` секция (OWNERSHIP + zone canon) — соответствует коду.
- `import rules`, `non-goals`, `canonical shape` в `web-zones/studio.md` — каноничные, согласованы.
- `multi-entry build` упоминание — корректно.
- DnD-архитектура (слои валидации `canAcceptChild → canDropInto → canMoveInto → canInto`) — точно описана в AI-anchor.
- EditorController handlers (8 штук из них описанных) — описаны верно, не хватает только `onUpdateNodeProps` (п.2).
- Test coverage таблицы — пути и количество тестов выглядят свежими.

---

## Резюме для архитектора

Главные блоки расхождения «doc vs code»:

1. **Generators переехал в data-gen — ни одно описание это не отражает** (OWNERSHIP/anchor/user-doc/README).
2. **`/controllers` subpath расширился до product-block UI-editor'а** — задокументированы 2 экспорта из 13. Plus новый handler `onUpdateNodeProps`.
3. **`/capsule` регистрирует 6 компонентов**, в доке — 1.
4. **Inspector kit-injection (`IInspectorKit`/`DEFAULT_KIT`) не описан нигде.** + stale-known-limit про «нативный fallback» — фактически уже web-ui.
5. **`/inspector` и `/state` public surface шире, чем описано** (utility-функции, типы, опции).
6. **EditorProvider инвариант (DnD изоляция) + `showDefaultOverlay` prop** — только в JSDoc, не в Markdown.

Если решения по пп.1–6 принимаются — конкретные PR'ы лежат на стороне `owner-studio` (правка `OWNERSHIP.md`, `docs/_meta/studio.md`, `README.md`) и `docs-writer` (правка `docs/09-packages/studio.md`).
