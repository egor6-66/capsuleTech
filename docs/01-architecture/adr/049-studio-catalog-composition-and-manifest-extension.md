---
tags: [hca, adr, accepted, studio, kit, catalog, composition]
status: accepted
date: 2026-06-13
last_updated: 2026-06-13
---

> [!success] Status
> **Accepted** — 2026-06-13. Sister к [[047-frontend-architecture-zones-cycle-vendor|047]] (zone canon) и [[048-docs-as-data|048]] (docs-as-data).
>
> Этот ADR — про **первый продукт-блок studio** (`/catalog`): фиксирует **composition rule** (studio = composer, palette ⊂ catalog, layout в app) и расширяет canonical `IPrimitiveManifestEntry`, чтобы catalog мог показать компонент со всех сторон без studio-side overlay'я.
>
> Принят как есть после feedback owner-studio (D2/D3/D5 блокеры встроены в текст, см. [`feedback-from-owner-studio.md`](../../_archive/2026-06-13-studio-catalog/feedback-from-owner-studio.md)).

# ADR 049 — Studio Catalog composition + manifest extension

## Контекст {#context}

### Pain 1 — Composition rule живёт только в памяти {#pain1}

`feedback_studio_composition_rule` зафиксировал в auto-memory: «studio экспортит product-blocks, raw engines — в отдельных пакетах». Это правило **нигде не каноничится** в `docs/` — ни в ADR'ах, ни в zone-каноне `docs/_meta/web-zones/studio.md` (он описывает зону, но не правило композиции продукт-блоков).

Без ADR'а правило **не обязывает**. Любой следующий контрибутор может «по-быстрому» вкатать в `@capsuletech/web-studio/catalog` свой ad-hoc движок (`web-renderer`-подобный, свой docs-engine, свою CVA-обвязку), и зона расползётся. Studio превратится в свалку «всё для дизайн-тайма».

### Pain 2 — Catalog нужен модульно, не монолитно {#pain2}

«Каталог» — не одна страница. Это **набор представлений** одного компонента: palette (выбор), preview (рендер), inspector (props), manifest-view (raw JSON), bundle-info (вес/externals), docs-panel (`<DocSection>`), contract (TS-типы), variants (CVA-матрица + сохранённые examples + custom).

Если упаковать всё в один компонент `<Catalog />`:
- App теряет контроль над layout'ом (Unreal/Unity-style dockable panels невозможны).
- Каждый модуль не может консьюмиться в отрыве (например, `inspector` нужен в `/component-builder` без палитры).
- События (`onSelect`, `onChange`, `onCreateCustomVariant`) проксируются через один монолит — нечитаемо.

Раздробить на независимые модули с `useEmit` (ADR 032) — естественное решение, но **нужен ADR-канон**, иначе модули срастутся при первой удобной возможности.

### Pain 3 — `IPrimitiveManifestEntry` недостаточен для catalog'а {#pain3}

Текущий shape (`packages/web/kit/ui/src/manifest/types.ts`) покрывает:
- **Identity:** `type`, `label`, `category`.
- **UI metadata:** `icon`, `description`.
- **Inspector:** `defaultProps`, `propsSchema`, `styleSlots`.
- **DnD:** `accepts`, `isLeaf`, `canBeRoot`.
- **Bundle-cost (auto):** `name`, `subpath`, `weight`, `sizeKB`, `externals`, `slotTags`, `variants`.

Чего **нет**, и что нужно catalog'у:
- **Именованных props-сценариев** (для variants-модуля: «Card with header+footer», «Card minimal»). Сейчас только `defaultProps` (один сценарий).
- **Связи с doc-секциями** (для docs-panel: показать раздел ADR 042 «tokens» рядом с Button.tsx).
- **Указателей на TS-типы props/slots/events** (для contract-модуля: имя интерфейса, чтобы найти его в `.d.ts`).
- **Явных связей с другими manifest'ами** (для relatedTypes-модуля: Card → [Card.Header, Card.Body]). Сейчас выводится имплицитно через `accepts` + `category:'composite'`.
- **Тегов для поиска** (для палитры с фильтрацией).

Альтернатива «studio-side overlay» (отдельный JSON в `@capsuletech/web-studio/catalog`) отвергнута на S2-unification (2026-06-13): manifest объявлен единственным источником правды о компоненте кита. Дополнительный overlay = drift гарантирован.

### Pain 4 — Manifest co-location {#pain4}

Сейчас все manifests лежат в `packages/web/kit/ui/src/manifest/manifests/{button,card,...}.tsx`. Bundle-cost: при импорте только `button.tsx` потребитель **может** притянуть и его manifest (зависит от bundler'а и tree-shake'а). Tree-shake friendly решение — manifest **рядом с компонентом** в его директории. Это рефактор внутри `@capsuletech/web-ui`, не зона ADR'а; но мы **фиксируем direction**, чтобы owner-web-ui не сделал переезд «как удобнее».

## Решение {#decisions}

### D1 — Composition rule (canon) {#D1}

**Studio = composer для product-blocks. Raw engines живут в своих пакетах.**

- `@capsuletech/web-studio/<block>` — каждый subpath это **product-block** (logic-editor, component-builder, inspector-panel, catalog, …).
- Studio **не имеет собственных движков**. Каталог собирается из:
  - `@capsuletech/web-ui/manifest` — источник правды о компонентах.
  - `@capsuletech/web-renderer` — рендер preview.
  - `@capsuletech/web-style` — токены, CVA-helpers.
  - `@capsuletech/web-studio/docs` (per [[048-docs-as-data|ADR 048]]) — `<DocSection>` для docs-panel.
  - `@capsuletech/web-dnd` — drag в будущий `/component-builder`.
  - `@capsuletech/data-gen` — палитра-темплейты для preview.
- Свой код studio — **тонкая обвязка**: композиция модулей + emit-каналы + типизация.

App = layout-композитор. Studio модули могут быть смонтированы в любом порядке/любых dockable panels (Unreal/Unity-style). Studio **не диктует** layout, **не делает routing**, **не делает persistence** — это всё в app.

### D2 — Catalog = композиция независимых модулей {#D2}

`@capsuletech/web-studio/catalog` экспортит **независимые модули**:

```
@capsuletech/web-studio/catalog
  ├── palette        ← селектор компонентов (трёхуровневый accordion)
  ├── preview        ← рендер выбранного компонента (через web-renderer)
  ├── inspector      ← редактор props (переиспользуется из /inspector-panel)
  ├── manifest-view  ← raw manifest (JSON в читаемой форме)
  ├── bundle-info    ← sizeKB / weight / externals / subpath / slotTags / variants
  ├── docs-panel     ← <DocSection> по manifest.docsRefs (consumer studio/docs)
  ├── contract       ← TS-типы props/slots/events
  └── variants       ← CVA-матрица + named examples + custom-сохранённые
```

Каждый модуль:
- Самостоятельный Solid-компонент (или несколько связанных).
- Принимает `type: string` (dot-path компонента, e.g. `'ui.Button'`) и собственные props.
- Эмитит события через `useEmit` (см. D3).
- Не зависит от других модулей (palette может быть смонтирован один; inspector — один; и т.д.).

**Packaging.** Все 8 модулей экспортируются из **единого subpath** `@capsuletech/web-studio/catalog` named exports'ами (`Palette`, `Preview`, `Inspector`, `ManifestView`, `BundleInfo`, `DocsPanel`, `Contract`, `Variants`). Tree-shake обеспечивается ESM-сборкой; consumer импортит только нужное. Этот выбор зеркалит D3 (catalog = единый emitter): один subpath ↔ один package-emitter ↔ один `Feature<Catalog.Events>` в app'е. Альтернатива «8 subpath'ов» (`/catalog/palette`, `/catalog/preview`, …) отвергнута — раздувает build-config и API surface без выгод; модули небольшие, контракт общий, миграция кода между модулями не должна ломать публичный API.

**Палитра — только компоненты.** Любые другие срезы (variants, docs, manifest, bundle, contract) — **отдельные модули**, рисуются параллельно палитре, **не внутри** элемента палитры. Это закрепляет single-responsibility и позволяет app пересобирать UX как угодно.

**Accordion палитры** — трёхуровневый: категория → компонент/композиция → sub-components. Variants/examples появляются в `variants`-модуле, не в палитре.

### D3 — Все события через `useEmit` {#D3}

Per [[032-package-controllers-and-useemit|ADR 032]] — catalog **единый package-emitter**. События неймспейсятся через `<module>/<event>` (slash-separated). App ловит **одну** `Feature<Catalog.Events>` на весь catalog — не по Feature на модуль.

Type union `Catalog.Events` экспортируется из `@capsuletech/web-studio/catalog` (зеркалит D2 «один subpath с named exports»).

Базовый event-каталог (расширяется по мере реализации):
- `palette/onSelect({ type })` — выбран компонент.
- `palette/onHover({ type })` — наведение (опционально для preview-on-hover).
- `inspector/onChange({ type, props })` — обновлены props.
- `inspector/onReset({ type })` — сброс к defaultProps.
- `variants/onSelect({ type, variantId })` — выбран сохранённый example/custom.
- `variants/onCreateCustom({ type, name, props })` — пользователь сохранил custom-вариант.
- `variants/onDeleteCustom({ type, variantId })` — пользователь удалил custom-вариант.
- `docs-panel/onOpenSlug({ slug })` — переход по `[[wikilink]]` внутри docs.

**Почему единый emitter, а не per-module.** Catalog логически один продукт-блок: app пишет одну Feature, ловит все события в общем handler-наборе. Когда логика app решает «при клике в палитре сбросить inspector» — оба handler'а уже в одном scope, не надо координировать два Feature. Per-module emitters раздули бы количество Feature'ов в app'е без выгод — модули в `Catalog.Events` уже различимы по namespace-префиксу.

App **не обязан** ловить все события. Если `palette.onSelect` не подключён, поведение «выбора» определяется default-state внутри модуля (внутренний signal). Каноничный кейс — app ловит и расшаривает selected-type через свой store между palette/preview/inspector.

### D4 — Палитра is только компоненты (rule) {#D4}

Палитра **не** показывает:
- сохранённые variants (это `variants`-модуль),
- docs (это `docs-panel`-модуль),
- raw manifest (это `manifest-view`-модуль),
- bundle-info (это `bundle-info`-модуль),
- contract (это `contract`-модуль).

Палитра показывает **только дерево компонентов** (трёхуровневый accordion). Это правило — следствие D2 (single-responsibility), но **явно отдельно**, потому что соблазн «впихнуть variants в expand палитры» сильный.

### D5 — Расширение `IPrimitiveManifestEntry` {#D5}

Каноничный `IPrimitiveManifestEntry` (`packages/web/kit/ui/src/manifest/types.ts`) расширяется **пятью опциональными полями** + новым интерфейсом `IExample`. Поля живут в kit, не в studio-side overlay (S2-unification: manifest — single source of truth).

```ts
export interface IExample {
  /** Стабильный id внутри компонента. Используется как ключ React-list'а. */
  id: string;
  /** Человекочитаемое имя (для variants-модуля). */
  label: string;
  /** Опциональное описание (tooltip / subtext). */
  description?: string;
  /** Props сценария. Должны валидироваться `propsSchema`. */
  props: Record<string, unknown>;
}

export interface IPrimitiveManifestEntry {
  // ... existing fields ...

  /**
   * Именованные props-сценарии. Первый = default-example
   * (взаимозаменяем с `defaultProps`, см. ниже).
   * Consumed by `@capsuletech/web-studio/catalog/variants`.
   */
  examples?: IExample[];

  /**
   * Slug'и из docs-registry (ADR 048).
   * Consumed by `@capsuletech/web-studio/catalog/docs-panel`
   * → `<DocSection slug={...} />`.
   *
   * Формат slug'а: `'<doc-path>#<section-id>'` или `'<doc-path>'` (вся страница).
   * Example: `['adr/042#tokens', '_meta/web-ui#button']`.
   */
  docsRefs?: string[];

  /**
   * Указатели на TS-типы. Имена типов (строки) — для contract-модуля,
   * который найдёт их в `.d.ts`. На MVP (D6) — informational only.
   * Example: `{ propsType: 'IButtonProps', eventsType: 'IButtonEvents' }`.
   */
  contract?: {
    propsType?: string;
    slotsType?: string;
    eventsType?: string;
  };

  /**
   * Явные связи с другими manifest'ами (по `type` dot-path).
   * Used by relatedTypes-модуль / композитными секциями палитры.
   * Example (Card): `['ui.Card.Header', 'ui.Card.Body', 'ui.Card.Footer']`.
   *
   * Раньше выводилось имплицитно через `accepts` + `category:'composite'`.
   * Теперь — явно, потому что implication через `accepts` хрупкая.
   */
  relatedTypes?: string[];

  /**
   * Lowercase-теги для поиска/фильтрации в палитре.
   * Example: `['form', 'a11y', 'kobalte']`.
   */
  tags?: string[];
}
```

**Backwards-compat:** все 5 полей опциональные. Существующие manifests (button.tsx, card.tsx, …) валидны без правок. Backfill — отдельная задача owner-web-ui (Button + Card как эталон в первом PR, остальное touch-once).

**Convention для `contract`.** Типы (`propsType` / `slotsType` / `eventsType`) — имена type/interface, экспортируемые **из того же subpath, что и компонент** (т.е. из `manifest.subpath`, auto-derived):

```ts
// manifest:
{ subpath: '@capsuletech/web-ui/button', contract: { propsType: 'IButtonProps' } }

// resolver:
import type { IButtonProps } from '@capsuletech/web-ui/button';
```

На MVP (D6) поле informational; в будущем build-time type-extract резолвит через типизированный import. Следствие для owner-web-ui: компонент должен экспортировать одноимённый `interface`/`type` из своего subpath. Большинство уже так делает; если нет — backfill при наполнении `contract`.

**Convention для `examples` и `defaultProps`.** Оба поля сосуществуют. `defaultProps` остаётся источником для создания новой ноды (inspector / DnD). `examples[0]` — это «представительский» вариант для variants-модуля. Manifest **НЕ** enforce'ит согласование `examples[0].props` с `defaultProps`. Рекомендуется поддерживать `examples[0].props ≈ defaultProps` для UX-предсказуемости: пользователь видит «Default» в variants-модуле такой же, как при создании ноды через палитру/DnD. Тесты согласованности — на усмотрение owner-web-ui. Если `examples` пустой/отсутствует — variants-модуль fallback'ается на `defaultProps`.

### D6 — Contract-модуль MVP через runtime introspection {#D6}

Contract-модуль показывает «что у компонента в типах» — props/slots/events.

**На MVP — runtime `propsSchema` introspection.** Обход zod-схемы (`.shape`, `.def`, `.options`), вывод имён полей + их типов в JSON-tree. Быстро, неполно, но достаточно чтобы показать пользователю «какие props принимает компонент».

**Полное решение (отложено)** — build-time type-extract: новый пакет `@capsuletech/type-extract` парсит `.d.ts` через ts-morph, эмитит JSON с полными типами (включая union, generics, slots). Подключается через `manifest.contract.propsType: 'IButtonProps'` → type-extract находит интерфейс и сериализует. Это **отдельный пакет**, **отдельный owner**, **отдельный ADR** — здесь только зафиксирован путь.

На MVP `contract.propsType` / `slotsType` / `eventsType` — informational (показываются как строка-имя; «open in IDE» — best-effort через `Ctrl+Click` если IDE поддерживает).

### D7 — Custom variants storage = app-side {#D7}

Studio **не владеет** persistence custom-вариантов.

Поток:
1. `variants`-модуль принимает `customVariants?: Record<string, IExample[]>` (key — `type` компонента).
2. Пользователь создаёт custom-вариант → модуль эмитит `variants.onCreateCustom({ type, name, props })`.
3. App ловит event, сохраняет в свой storage (LocalStorage в playground, БД в реальном app'е).
4. App подаёт обновлённый `customVariants` обратно в `variants`-модуль.

Это решает: persistence ⊥ studio (testing-friendly, no localStorage в SSR), `variants` остаётся stateless по storage'у.

### D8 — Manifest co-location: вариант A {#D8}

Manifests **переезжают рядом с компонентом**:

**До:** `packages/web/kit/ui/src/manifest/manifests/button.tsx`
**После:** `packages/web/kit/ui/src/primitives/button/manifest.tsx` (либо `src/button/manifest.tsx` — owner-web-ui решит исходя из текущей структуры primitives).

Tree-shake friendly: при импорте только компонента (`import { Button } from '@capsuletech/web-ui/button'`) manifest **не** притягивается. Manifest консьюмится **отдельно** через `@capsuletech/web-ui/manifest` (агрегатор), где остаётся registry + types.

Это рефакторинг внутри `@capsuletech/web-ui`, owner — `owner-web-ui`. ADR фиксирует direction; конкретный layout файлов (отдельный `manifest.tsx` vs встроить в `button.tsx`) — на усмотрение owner-web-ui с предпочтением **отдельного файла** (variant A в брифе) для читаемости.

## Что НЕ решает ADR 049 (явно вне scope) {#non-goals}

- **Layout каталога в app'е** — какие модули, в каких dockable panels, в каком порядке. Это app-side. Catalog предоставляет независимые модули, app собирает страницу.
- **Routing studio.** `/catalog`, `/component-builder`, `/inspector-panel` — это **subpath'ы пакета**, **не** URL'ы. App может зарегистрировать их в любом router'е (TanStack Solid Router в capsule-apps).
- **Build-time type-extract** (`@capsuletech/type-extract`) — отдельный пакет, отдельный ADR, отдельный owner. См. D6.
- **Конкретная UX палитры** — accordion vs treegrid vs cards — решается реализацией. ADR фиксирует только трёхуровневую иерархию + «только компоненты».
- **Persistence custom-вариантов в реальных app'ах** — backend choice (LocalStorage / IndexedDB / REST API) — app-side, см. D7.
- **Live-edit manifest'а** (через inspector → mutate `manifest.examples`) — не сейчас. Сначала стабилизируем shape, потом — отдельным sub-ADR'ом.
- **Тестирование catalog модулей** — отдельный план owner-studio.

## Последствия {#consequences}

**+** Composition rule зафиксирован каноном. Будущие product-blocks (logic-editor, component-builder, inspector-panel) следуют той же модели.
**+** Catalog модули независимы → app свободен в layout'е, переиспользование вне `/catalog` возможно (`inspector` в component-builder, `docs-panel` в about-page, etc.).
**+** Manifest single source of truth подтверждён (никакого studio-side overlay'я). Drift = 0.
**+** Tree-shake улучшается после D8 — компонент без manifest'а легче в bundle'е consumer'а.
**+** События каналируются через `useEmit` (ADR 032), app ловит как `Feature<Catalog.Events>` — единая модель.
**+** Backwards-compat: все новые поля опциональные, backfill идёт постепенно.

**−** Расширение manifest shape — touch-once для backfill всех 15 текущих manifest'ов. Не блокирующий, но requires owner-web-ui-цикла.
**−** Co-location (D8) — рефактор внутри web-ui (move 15 файлов, обновить registry, обновить scripts/build-manifest.mjs). Один PR от owner-web-ui.
**−** Contract-модуль MVP неполный — runtime introspection даст частичную картину (zod-уровень, без TS-generics). Полное решение — отдельный пакет (D6).
**−** Custom variants storage в app'е — каждый app должен реализовать persistence сам (для playground'а — LocalStorage 1 файл). Не блокирующий, но дополнительный код в app'е.

## Roll-out {#rollout}

Фазы после approval (порядок + зависимости):

- **W-UI manifest (owner-web-ui)** — расширение `IPrimitiveManifestEntry` + `IExample` + backfill Button + Card как эталоны + co-location (D8). Один PR. Блокирует «Catalog wiring», **не** блокирует «Catalog skeleton».
- **Catalog skeleton (owner-studio)** — единый subpath `@capsuletech/web-studio/catalog` с 8 named exports (`Palette`, `Preview`, `Inspector`, `ManifestView`, `BundleInfo`, `DocsPanel`, `Contract`, `Variants`) + экспорт `Catalog.Events` union. Эмиссия событий через `useEmit` с namespace'ом `<module>/<event>`. Опциональные manifest-поля не блокируют — модули gracefully degrade при их отсутствии (пустой docs-panel, пустой variants, etc.).
- **Catalog wiring (owner-studio)** — после backfill Button/Card подключить `variants` / `docs-panel` / `contract` модули к новым полям (`examples`, `docsRefs`, `contract`).
- **A1 playground (пользователь)** — пользователь собирает страницу `/catalog` в playground'е, демонстрирует модули в реальном dockable layout'е, ловит события через `Feature<Catalog.Events>`. Зона **user-edit**, не главного и не owner-агента.
- **W-UI manifest backfill — остальное** — owner-web-ui проходит остальные 13 примитивов touch-once. Не блокирует A1.

## Альтернативы (rejected) {#alternatives}

- **Монолитный `<Catalog />` компонент** — упаковать всё в один. Закрывает D2/D4, но убивает modular reuse + dockable layouts. Отвергнуто.
- **Studio-side overlay JSON** — расширения manifest'а живут отдельным реестром в `@capsuletech/web-studio`. Drift гарантирован (правки в одной форме не доходят до другой). Отвергнуто на S2-unification.
- **Два отдельных ADR** (composition rule + manifest extension) — чище разделение, но дороже cross-ref'ы. Логически связаны (catalog требует расширения), один ADR проще для обсуждения. Отвергнуто.
- **Variants как property в палитре** — раскрывать variants в expand-узле палитры. Палитра становится «всё про компонент» вместо «селектор компонентов». Single-responsibility ломается. Отвергнуто (D4).
- **Build-time type-extract сразу** — полное решение для contract-модуля. Требует нового пакета, нового owner'а, ts-morph + AST. Не блокирующее для MVP catalog'а. Отложено.
- **Per-component manifest файл встроить в `button.tsx`** (variant B) — manifest как `export const manifest = {...}` рядом с компонентом. Минус — раздувает component-файл, mixed concern. Variant A (отдельный `manifest.tsx`) — чище.
- **`docsRefs` хранить в docs-registry** (обратное связывание: registry хранит `componentRefs`) — манифесты остаются неизменными, registry эмитит связку. Но catalog ищет «что показать рядом с этим компонентом» → лоокап по manifest'у удобнее, чем reverse-lookup по registry. Отвергнуто.

## Open questions {#open-questions}

- **`palette` vs `palette-search`** — нужен ли отдельный модуль для поиска по `tags`, или search встроен в palette? Предпочтение — встроен (одно UX-целое), решается на реализации.
- **`variants.examples` vs separate registry** — поддерживать ли отдельный `IBuiltCatalogManifest` с custom-данными от app'а, или встроить custom-варианты в runtime-state модуля? Предпочтение — runtime-state в `variants`-модуле (props `customVariants`).
- **`docsRefs` syntax** — `'adr/042#tokens'` или `'docs/01-architecture/adr/042-canonical-token-system-and-skin-contract#tokens'`? Слэжное прокси решает ADR 048 — здесь следуем его конвенции.
- **`contract` для slots** — slot-types ≠ props-types. Нужен ли отдельный канал для slot-схем (например, `slotsSchema?: Record<string, ZodTypeAny>` — zod-схемы для children)? Не сейчас; вернёмся при появлении real-needs.
- **`examples` для composite-компонентов** — Card.Header сам по себе variant Card'а или независимая запись? Сейчас — независимая (отдельный manifest entry per part), `relatedTypes` связывает. Если станет неудобно — пересмотрим.
- **Live tokens preview в catalog'е** — обновление токена в `/style-editor` → reactive update preview в catalog'е. Архитектурно работает (CSS-переменные), но требует тонкой координации app-side. Не в этом ADR.

## Ссылки {#related}

- [[032-package-controllers-and-useemit|ADR 032]] — useEmit как канал событий пакетов.
- [[033-package-registration|ADR 033]] — capsule manifest registration (как catalog модули регистрируются).
- [[047-frontend-architecture-zones-cycle-vendor|ADR 047]] — zone canon (studio = 5-я зона).
- [[048-docs-as-data|ADR 048]] — docs registry, `<DocSection>`, slug-схема для `docsRefs`.
- [`docs/_meta/web-zones/studio.md`](../../_meta/web-zones/studio.md) — zone canon studio (этот ADR обновит его после approval).
- [`docs/_meta/studio.md`](../../_meta/studio.md) — AI-anchor studio.
- [`docs/_meta/web-ui.md`](../../_meta/web-ui.md) — kit AI-anchor.
- [`packages/web/kit/ui/src/manifest/types.ts`](../../../packages/web/kit/ui/src/manifest/types.ts) — текущий shape `IPrimitiveManifestEntry`.
- `STUDIO-CATALOG-BRIEF-architect.md` — бриф owner-studio (исходник этого ADR).
- `STUDIO-CATALOG-BRIEF-owner-web-ui.md` — ТЗ owner-web-ui (D5 + D8).
