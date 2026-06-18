---
title: Palette — Button-эталон audit перед роспуском на остальные примитивы
status: draft
audience: architect
last_updated: 2026-06-18
---

# Контекст

Палитра студио (`packages/web/studio/src/palette/`) подключена, **Button работает end-to-end** — палитра показывает компонент с пресетами, выбор пресета пишет схему в shared selection-store, `<WebStudio.Canvas>` рендерит её через `@capsuletech/web-renderer` в iframe-shell, `<WebStudio.Props>` редактирует пропсы (incl. icon-picker), `<WebStudio.Info>` показывает контракт + манифест + README через `DocPage` по `manifest.docSlug`. Документация-через-vault — отдельный тред, не сюда.

User собирается **подтягивать остальные примитивы в палитру по накатанной**. Перед стартом — проверка «всё ли чисто и по канону на Button», чтобы шаблон не размножил техдолг на 15+ компонентов.

Этот бриф собран в review-сессии 2026-06-18 (просмотрены все файлы цепочки от kit primitive до studio palette/canvas/inspector/info; код не правился, только анализ).

> **Привязка к PRIORITY 0 (canon: модули, не монолит).** Часть замечаний ниже = именно то, что новый канон называет «корнями пакета в соседа» и «фиксом симптома, а не причины». Это не косметика — это структурные решения, которые определяют, можно ли потом релизить kit/studio независимо.

# Карта флоу Button (для resume в новой сессии)

**kit-side** `packages/web/kit/ui/src/primitives/button/`:
- `button.tsx` — компонент (Slot + CVA + data-slot/variant/size, loading/disabled/fullWidth/as)
- `variants.ts` — CVA (variant 6, size 4)
- `interfaces.ts` — `IButtonProps<T>` polymorphic
- `button.contract.ts` — `defineContract` из `@capsuletech/web-contract` (rule.props **со всеми пропсами incl. size**, rule.variants, rule.styleSlots, rule.examples)
- `button.manifest.tsx` — `ButtonManifest: IComponentManifest` (type/label/category=control/icon/defaultProps/propsSchema/docSlug/isLeaf)
- `README.md` — frontmatter + полный набор разделов
- `index.ts` — экспорт `Button + ButtonContract + types`. **НЕ экспортирует manifest.**
- `__tests__/`, `__browser__/`, `button.stories.tsx`

**kit-side registry** `packages/web/kit/ui/src/manifest/`:
- `types.ts` — `IPrimitiveManifestEntry` (канон) + `@deprecated IComponentManifest` alias
- `registry.ts` — ALL[] + Map BY_TYPE + getManifest/listByCategory/canAcceptChild/summarize/getCategories
- `index.ts` — public subpath `@capsuletech/web-ui/manifest`

**studio** `packages/web/studio/src/`:
- `palette/ComponentsPalette.tsx` — Accordion L1 (Примитивы/Композиции) → ComponentNode → PresetItem
- `palette/groups.ts` — хардкод `PRIMITIVE_CATEGORIES`/`COMPOSITION_CATEGORIES`
- `palette/presets/{button.tsx,index.ts,types.ts}` — 7 пресетов JSON-схемой + Record по типу
- `palette/rules.ts` — `fieldRules['ui.Button']` (size==='icon' → hidden:['children'])
- `selection.ts` — singleton Solid Store (preset/schema + setSelected/patchProps/patchNodeType)
- `controllers/WebStudioCanvas.tsx` — Renderer + REGISTRY={ui: kit + Icons} + CanvasFrame iframe
- `controllers/WebStudioProps.tsx` — Inspector + icon-picker (iconChild startsWith `ui.Icons.`)
- `controllers/WebStudioInfo.tsx` — резолв manifest+contract → `<Info>`
- `info/{Info,ContractBlock,ManifestBlock,ReadmeBlock,contract-registry}.tsx`
- `info/contract-registry.ts` — **hand-maintained** `{'ui.Button': ButtonContract, 'ui.Card': CardContract}`
- `inspector/zod-to-categories.ts` — ZodObject → ICategory[] (String/Enum/Boolean/Number, unwrap Optional/Default)
- `inspector/kit.tsx` — DEFAULT_KIT (Input/Toggle/Select/Textarea)
- `manifests/registry.ts` — thin re-export `@capsuletech/web-ui/manifest`
- `capsule.ts` — defineCapsuleModule, components: Canvas/CanvasStyle/ComponentsPalette/Info/Navigation/Props

# Замечания

## Критические — определяют шаблон следующих примитивов

### A. `ButtonManifest.propsSchema` неполная: нет `size`

`button.contract.ts` декларирует `size: 'default'|'sm'|'lg'|'icon'` в `rule.props(...)`.
`button.manifest.tsx::propsSchema` содержит **только `variant + children + class`** — `size` нет.

Последствия:
- В Inspector'е нет поля `size` — юзер не может переключить размер руками.
- `palette/rules.ts` триггерит `props.size === 'icon'` → hidden:['children'], но `size === 'icon'` сейчас появляется ТОЛЬКО при выборе icon-preset (там захардкожено). При смене на другой пресет — `size` стирается.
- Контракт и манифест разъехались — два source-of-truth для props компонента.

**Канон PRIORITY 0 п.1:** фиксим причину. Причина — дублирование описания props. Manifest.propsSchema должен либо **выводиться** из contract.props, либо **полностью зеркалить**. Лучше первое — один rule.props в contract, manifest читает.

Возможные решения:
1. `manifest.contract` ссылка → `propsSchema = derive(contract)` через helper в `@capsuletech/web-contract`.
2. Или contract.props = `manifest.propsSchema` (наоборот).
3. Или ввести `propsFromContract(ButtonContract)` helper и manifest вызывает (single source, но manifest всё ещё «знает» про contract).

Я бы шёл по (1): contract — root, manifest читает. Studio inspector тогда тоже может опционально брать `contract.rule.examples` для preset-вариантов автоматически.

### B. `info/contract-registry.ts` — hand-maintained Record на стороне studio

Сейчас в studio:
```ts
const CONTRACT_BY_TYPE: Record<string, Contract> = {
  'ui.Button': ButtonContract,
  'ui.Card': CardContract,
};
```

Каждый новый primitive с контрактом = правка studio.

**Канон PRIORITY 0 п.2:** studio не должен знать **как** kit устроен. Сейчас studio импортит конкретные контракты по именам — это «корень в соседа».

Решение: `getContract(type)` живёт в `@capsuletech/web-ui/manifest` рядом с `getManifest(type)`. Реализация — либо `manifest.contract?: Contract` поле (manifest и contract co-located в kit'е), либо отдельный contract-registry в kit. Studio просто потребляет `getContract`.

Удалить `studio/src/info/contract-registry.ts` полностью.

### C. Презеты + field-rules — где живут? (kit vs studio)

Сейчас в studio:
- `palette/presets/button.tsx` (вариации Button)
- `palette/rules.ts['ui.Button']` (когда `size==='icon'` → hidden:['children'])

**По смыслу — это знание о КОМПОНЕНТЕ:**
- Пресет = «как этот компонент типично выглядит» (вариация компонента).
- Field-rule = «при таких пропсах поле X семантически бессмысленно» (свойство компонента).

Если оставить в studio — **каждый новый примитив = правка двух мест в studio + manifest в kit**. То есть kit-компонент не самодостаточен, studio пускает корни в каждый примитив.

**Канон PRIORITY 0** прямо это запрещает: «Пакет с корнями в соседа = монолит-in-disguise — нельзя релизить независимо».

Контр-довод (memory `feedback_studio_composition_rule`): «studio = product-blocks». Но это про **product-blocks vs raw engines** (extract logic-editor/component-builder в свои пакеты). Пресет компонента ≠ raw engine — это **вариация компонента**, kit-domain.

Предлагаемое решение:
- `manifest.presets?: readonly IPreset[]` — пресет рядом с manifest в kit.
- `manifest.fieldRule?: FieldRule` — rule рядом с manifest в kit.
- Studio: `palette/presets/index.ts` + `palette/rules.ts` удаляются. Палитра дёргает `m.presets` напрямую, Inspector — `m.fieldRule(props)`.

Тип `IPreset` тоже переезжает в kit (`@capsuletech/web-ui/manifest`).

**Но! Watch out:** `IPreset.schema` = JSON-схема Renderer'а (`ISchema` из `@capsuletech/web-renderer`). Если manifest импортит `web-renderer` — kit получает dep на renderer. Это **новый корень**. Альтернатива — `IPreset` типизировать через свой минимальный shape, не через `ISchema` (потом расширять).

Это надо обсудить отдельно. Возможный вариант: `ISchema` живёт в `@capsuletech/web-contract` (он уже типы расшаривает) — тогда оба пакета зависят от contract, а не друг от друга.

### D. `ButtonManifest: IComponentManifest` — deprecated тип

`manifest/types.ts`:
```ts
/** @deprecated use `IPrimitiveManifestEntry` directly. */
export type IComponentManifest = IPrimitiveManifestEntry;
```

`button.manifest.tsx` импортит deprecated alias. **Эталон не должен тянуть deprecated** — иначе все следующие манифесты тоже скопируют импорт.

Замена однострочная, но решить до второго компонента.

## Важные — DX/стиль

### E. Manifest не реэкспортирован из `primitives/button/index.ts`

Сейчас primitive index.ts отдаёт `Button + ButtonContract + types`. Manifest торчит «через registry» — импортится напрямую из `../primitives/button/button.manifest` в `manifest/registry.ts`.

Если канон «primitive = единое окно через index.ts» — manifest туда же. Иначе registry знает про file-paths primitive'а (cross-cutting concern).

### F. `PresetItem` в `ComponentsPalette.tsx` — raw `<button>`

```tsx
<button type="button" onClick={...} class="flex w-full items-center gap-2 rounded-sm px-2 py-1 ...">
```

`feedback_use_ui_kit_everywhere`: палитра — chrome студио, должна собираться из kit. Кандидаты:
- `Button variant="ghost" size="sm"` с custom-class.
- Новый primitive `PaletteItem`/`SelectableRow` в kit (если паттерн повторится в Inspector tabs и т.д.).
- `ToggleGroup` из Kobalte для exclusive-selection семантики (всегда ровно один выбран).

### G. Magic strings `'ui.Button'`/`'ui.Icons.Plus'` в presets

```ts
nodes.btn = { type: 'ui.Button', ... };
nodes.icon = { type: `ui.Icons.${iconChild}`, ... };
```

У манифеста есть `type`. Пресеты должны брать `ButtonManifest.type` константой. Иконки — отдельный реестр (`Icons` объект из `@capsuletech/web-ui/icons`) с runtime-проверкой имён.

### H. `groups.ts` хардкодит категории L1

```ts
const PRIMITIVE_CATEGORIES = ['control', 'typography', 'container', 'feedback', 'wrapper'];
const COMPOSITION_CATEGORIES = ['composition'];
```

При этом в `registry.ts` уже есть `getCategories()`. Дублирование source-of-truth — при добавлении новой category в kit (`types.ts`) разъедется со studio.

Лучше: `manifest.paletteGroup?: 'primitive' | 'composition'` либо маппинг категорий на L1-группы — **в kit**. Studio просто читает.

## Второстепенные — батч одной сессией после A-D

### I. `manifest.defaultProps` дублирует `propsSchema.default(...)`

Для какого consumer'а? В preset-флоу не используется (пресеты сами кладут props). Возможно для DnD-mode (Mode 2 — будущая итерация, добавление ноды drag'ом из палитры). Если так — описать roadmap, иначе удалить.

### J. `singleButton(...)` — inline-builder JSON-схемы пресета

Сейчас в `presets/button.tsx`:
```ts
const singleButton = (props, iconChild?) => ({
  components: { root: 'btn', nodes: { btn: {...}, icon: {...} } }
});
```

На 10 примитивов = 10 копий. Helper `buildPreset(type, props, children?)` в одном месте.

### K. `iconChild()` хардкодит `child.type.startsWith('ui.Icons.')`

В `WebStudioProps.tsx` логика «есть ли у ноды child-иконка, и какой» жёстко привязана к `ui.Icons.*`. Для будущих примитивов с «child-as-prop» (toggle с иконкой, card с image-child, list с custom-item-renderer) нужен generic mapping через manifest, например:

```ts
manifest.childAsProp?: {
  propKey: 'icon';           // имя prop'а в Inspector
  childTypePrefix: 'ui.Icons.';
  options: () => readonly string[]; // или ref на kit subpath
};
```

# Предлагаемый порядок обсуждения

1. **A** — propsSchema полнота + derive-from-contract.
2. **B** — `getContract` в kit, удаление studio contract-registry.
3. **C** — presets+fieldRule живут в kit рядом с manifest. **Watch out:** dep на `ISchema` (`web-renderer`) — нужно решить, где жить типу `ISchema`.
4. **D** — замена `IComponentManifest` → `IPrimitiveManifestEntry` в button.manifest.tsx + cleanup deprecated.
5. **E-H** батчем (DX правки).
6. **I-K** второй батч (или отложить до второго примитива — увидим живую боль).
7. **Только потом** — второй примитив (предлагаю Input как самый частоиспользуемый и с богатым набором variants).

# Что НЕ затронуто этим брифом

- Доку через `DocPage` по `docSlug` — отдельный тред (vault wiring, user сам).
- Iframe-canvas и canvas-style — уже работают, не предмет аудита.
- DnD-mode (Mode 2 — drag from palette) — будущая итерация, упомянут только в контексте `defaultProps` (замечание I).
- Reactive variant-props batch (owner-web-ui) — отдельный brief.

# Action items для архитектора (новая сессия)

- [ ] Перечитать этот бриф + Current checkpoint.
- [ ] Обсудить с user'ом A → B → C (структурные).
- [ ] Решить вопрос о месте `ISchema` (web-renderer? web-contract?) до перетаскивания presets.
- [ ] Согласовать с user'ом порядок: фиксить эталон → потом следующий примитив.
- [ ] **НЕ начинать второй примитив до закрытия A-D минимум.**

# Связанное

- `docs/_meta/web-ui.md` — AI-anchor kit'а.
- `docs/_meta/web-studio.md` — AI-anchor studio (если есть).
- `memory/feedback_canon_modules_no_crutches.md` — PRIORITY 0 canon (база для A/B/C).
- `memory/feedback_studio_composition_rule.md` — product-blocks vs raw engines (контекст для C).
- `memory/feedback_use_ui_kit_everywhere.md` — база для F.
- `memory/feedback_packages_adapt_to_architecture.md` — база для B/C.
