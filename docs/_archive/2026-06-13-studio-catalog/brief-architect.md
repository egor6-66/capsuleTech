# Бриф архитектору — Studio Catalog (итерация №1)

## Контекст

Студия материализуется по zone-канону (`docs/_meta/web-zones/studio.md`). Первая итерация — `/catalog` (презентация кита, аналог Storybook, но гибче и шире — показывает компонент со всех сторон: preview, props, размеры, manifest, контракты, доки, рефы).

## Композиционное правило (нуждается в канонизации ADR'ом)

**Catalog = композиция независимых модулей внутри studio. Layout — в app.**

```
@capsuletech/studio/catalog
  ├── palette        ← ТОЛЬКО селектор компонентов (accordion, категории, sub-components, variants)
  ├── preview        ← рендер выбранного компонента (через web-renderer + контент-кит)
  ├── inspector      ← редактор пропсов (= /inspector-panel, переиспользуется)
  ├── manifest-view  ← raw manifest (JSON, читаемая форма)
  ├── bundle-info    ← sizeKB / weight / externals / subpath / slotTags / variants
  ├── docs-panel     ← <DocSection> по manifest.docsRefs (= studio/docs consumer)
  ├── contract       ← TS-типы пропсов/слотов/событий (введение позже)
  └── variants       ← matrix CVA-вариантов + сохранённые examples + custom
```

- App сам выбирает, какие модули и куда монтировать (Unreal/Unity-style dockable panels). Studio не диктует layout.
- Все события — через `useEmit` (ADR 032): `palette.onSelect`, `inspector.onChange`, `variants.onCreateCustom`, `docs-panel.onOpenSlug` и т.д. App ловит как `Feature<Catalog.Events>`.
- Studio не делает routing / persistence — это в app.

## Принципы (закрепить в ADR)

1. **Studio = toolkit, app = composer.** Подтверждение `feedback_packages_adapt_to_architecture` + `feedback_studio_composition_rule`.
2. **Studio не имеет своих движков.** Каталог собирается из `web-ui/manifest`, `web-renderer`, `web-style`, `studio/docs`, `web-dnd` (для будущего drag-в-builder), `data-gen` (палитра-темплейты). Свой код — тонкая обвязка.
3. **Палитра = только компоненты.** Любые другие срезы информации (доки, manifest, bundle, размеры, контракты, варианты) — отдельные модули, рисуются параллельно палитре, не внутри элемента палитры.
4. **Аккордеон палитры** трёхуровневый: категория → компонент/композиция → sub-components. Variants появляются отдельным модулем `variants`, не в палитре.
5. **Все ивенты через useEmit.** App может перехватить любой клик/ховер/изменение.

## Что просим у архитектора решить

1. **ADR на расширение `IPrimitiveManifestEntry`.** Studio catalog'у нужны 5 опциональных полей:
   - `examples?: IExample[]` — именованные сценарии props (default + кастомные).
   - `docsRefs?: string[]` — slug'и из docs-registry (ADR 048) → консумится через `studio/docs`.
   - `contract?: { propsType?, slotsType?, eventsType? }` — указатели на TS-типы (для contract-модуля).
   - `relatedTypes?: string[]` — явные связи (Card → ['ui.Card.Header','ui.Card.Body']). Текущая выводилка через `accepts` + `category:'composite'` — имплицитная.
   - `tags?: string[]` — для поиска/фильтрации в палитре.

   Поля живут в canonical manifest (`@capsuletech/web-ui/manifest`), не в studio-side overlay. Аргумент — S2-unification 2026-06-13 уже сделал manifest единственным источником правды.

2. **Composition rule зафиксировать каноном.** Палитра ⊂ catalog, catalog = композиция модулей, layout в app. Сейчас это правило живёт только в `feedback_studio_composition_rule`-памяти.

3. **Скоп ADR.** Один или два?
   - Вариант A: один ADR «Studio catalog composition + manifest extension».
   - Вариант B: два ADR — «Manifest shape extension (kit canon)» и «Studio catalog as composable modules».
   Рекомендация — A, скоп связан логически.

4. **Contract-модуль — MVP через что?**
   - (a) Runtime `propsSchema` introspection (zod `.shape` обход) — быстро, неполно.
   - (b) Build-time type-extract (`.d.ts` → JSON, отдельный пакет `@capsuletech/type-extract`) — правильно, дольше.
   Рекомендация — (a) на MVP, (b) когда появятся ресурсы / новый пакет под type-extract.

5. **Custom variants storage.** App-side (LocalStorage в playground); studio эмитит `onCreateCustomVariant`, принимает `customVariants` обратно как props на модуль `variants`. Подтвердить, что в принципе studio storage НЕ владеет.

## Очерёдность работ

1. ADR — архитектор.
2. Расширение manifest shape — `owner-web-ui` (бриф рядом: `STUDIO-CATALOG-BRIEF-owner-web-ui.md`). Backfill для Button + Card как эталон.
3. Параллельно — owner-studio (= я) делает скелет catalog с независимыми модулями. Новые manifest-поля опциональны, не блокируют скелет.
4. После backfill Button/Card — owner-studio подключает variants/docs/contract модули к новым полям.
5. Дальше — `/inspector-panel`, `/style-editor`, `/shell` отдельными итерациями.

## Per-component manifest co-location

Сейчас манифесты лежат в `packages/web/kit/ui/src/manifest/manifests/{button,card,...}.tsx`. User хочет переместить каждый манифест **рядом со своим компонентом** (`packages/web/kit/ui/src/button/manifest.tsx` или прямо в `button.tsx`). Это рефакторинг внутри `@capsuletech/web-ui`, делает `owner-web-ui` (см. бриф).

## Связанные документы

- `docs/_meta/web-zones/studio.md` — zone canon.
- `docs/_meta/studio.md` — AI-anchor (после правок аудита).
- `docs/_meta/web-ui.md` — kit AI-anchor.
- `packages/web/kit/ui/src/manifest/types.ts` — текущий shape.
- ADR 032 — useEmit, package /controllers.
- ADR 033 — capsule manifest registration.
- ADR 048 — docs-as-data.
- `STUDIO-AUDIT-TMP.md` — параллельный fix doc-расхождений (уже у тебя).
