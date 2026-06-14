# Бриф `owner-web-ui` — расширение manifest shape + co-location

## Контекст

Studio запускает `/catalog` — модульный каталог компонентов kit'а с богатой презентацией: preview, props-editor, размеры, raw manifest, docs, contract, variants. Каталог собирается из независимых модулей внутри studio, layout — в app (см. `STUDIO-CATALOG-BRIEF-architect.md`).

`web-ui/manifest` — single source of truth для метаданных kit'а (S2-unification 2026-06-13). Каталогу нужны новые опциональные поля в `IPrimitiveManifestEntry` + рефакторинг расположения файлов manifest'ов.

## Задача 1 — расширение `IPrimitiveManifestEntry`

Файл: `packages/web/kit/ui/src/manifest/types.ts`.

Добавить **5 опциональных полей** (hand-authored, не build-time):

```ts
export interface IPrimitiveManifestEntry {
  // ... existing fields ...

  // ─── Catalog & documentation (hand-authored, optional) ──────────────────
  /**
   * Именованные сценарии props — для каталога и variant-matrix.
   * Первый элемент = default. Дополнительные = curated примеры.
   * Пользовательские (custom) варианты живут в app-side storage, не здесь.
   */
  examples?: IExample[];

  /**
   * Slug'и из docs-registry (ADR 048). Catalog консумит через
   * `@capsuletech/studio/docs` → `<DocSection slug={...}/>`.
   * Например: ['kit/button', 'kit/button-a11y', 'patterns/forms'].
   */
  docsRefs?: string[];

  /**
   * Указатели на TS-типы для contract-модуля каталога.
   * MVP: только строки-имена ('IButtonProps', 'IButtonSlots').
   * Реализация (runtime via propsSchema vs build-time type-extract) —
   * решение studio-side.
   */
  contract?: {
    propsType?: string;
    slotsType?: string;
    eventsType?: string;
  };

  /**
   * Явные связи с другими manifest'ами (Card → Card.Header, ...).
   * Сейчас связи выводятся через `accepts` + `category:'composite'`,
   * это имплицитно — catalog нуждается в явном массиве.
   */
  relatedTypes?: string[];

  /**
   * Теги для поиска / фильтрации в палитре каталога.
   * Свободная форма, lowercase, e.g. ['form', 'input', 'a11y'].
   */
  tags?: string[];
}

/**
 * Именованный сценарий props компонента.
 */
export interface IExample {
  /** Стабильный id (kebab-case). */
  id: string;
  /** Человекочитаемое имя (RU) для UI. */
  label: string;
  /** Короткое описание сценария (опционально). */
  description?: string;
  /** Конкретные props. Должны валидироваться `propsSchema`. */
  props: Record<string, unknown>;
}
```

Все поля **опциональны** — существующие manifest'ы продолжают работать без изменений.

### Тесты

- Unit-тест в `packages/web/kit/ui/src/manifest/__tests__/types.test.ts`: shape валидируется, optional-поля действительно optional.
- При желании — JSON-shape тест на zod-schema `IExample`.

## Задача 2 — backfill эталонов (Button + Card)

Заполнить 5 новых полей для двух manifest'ов как эталоны для остальных. Остальные 13+ primitives backfill'ятся инкрементально (отдельная задача / по мере необходимости).

### `ui.Button`

```ts
// в существующем ButtonManifest
examples: [
  { id: 'default', label: 'Default', props: { variant: 'default', children: 'Button' } },
  { id: 'destructive', label: 'Destructive', props: { variant: 'destructive', children: 'Delete' } },
  { id: 'outline', label: 'Outline', props: { variant: 'outline', children: 'Cancel' } },
  { id: 'ghost', label: 'Ghost', props: { variant: 'ghost', children: 'Menu' } },
  { id: 'link', label: 'Link', props: { variant: 'link', children: 'Learn more' } },
],
docsRefs: ['kit/button'], // slug'и определяются по факту наличия файлов в docs/.generated/
contract: { propsType: 'IButtonProps' },
tags: ['control', 'click', 'cta'],
```

### `ui.Card` (+ subcomponents Card.Header / Card.Body / Card.Footer)

```ts
// CardManifest
examples: [
  { id: 'default', label: 'Default', props: {} },
  { id: 'with-footer', label: 'С футером', props: { /* preset */ } },
],
docsRefs: ['kit/card'],
contract: { propsType: 'ICardProps', slotsType: 'ICardSlots' },
relatedTypes: ['ui.Card.Header', 'ui.Card.Body', 'ui.Card.Footer'],
tags: ['composition', 'container'],
```

Аналогично для Card.Header / Card.Body / Card.Footer — examples + docsRefs (если есть слаги).

### Если docs-slug'ов ещё нет

Поле `docsRefs` оставить пустым массивом — catalog справится. Не выдумывать slug'и под несуществующие файлы.

## Задача 3 — co-location manifest'ов (рефактор)

**Сейчас:** манифесты лежат отдельной папкой `packages/web/kit/ui/src/manifest/manifests/{button,card,...}.tsx`. Это quick-and-dirty организация.

**Цель:** каждый manifest рядом со своим компонентом, под единым правилом расположения. Два варианта расположения — выбрать тебе как owner'у:

- **Вариант A:** `src/<component>/manifest.tsx` (отдельный файл рядом).
- **Вариант B:** `src/<component>/<component>.tsx` экспортит manifest как named export вместе с компонентом.

Рекомендация — **A**, проще tree-shake и регистрировать; manifest не тянется когда импортится только компонент.

**Что менять:**

- Переместить файлы из `src/manifest/manifests/{X}.tsx` → `src/{X}/manifest.tsx`.
- Обновить barrel `src/manifest/registry.ts` (или `src/manifest/index.ts`) — собирать manifest'ы из новых путей.
- Сохранить публичный API `@capsuletech/web-ui/manifest` без изменений (только internal reorg).
- Тесты в `src/manifest/__tests__/` адаптировать к новым путям.

**Дополнительно — sanity-check для `build-manifest.mjs`:** скрипт ищет hand-authored manifest'ы. Проверить что новая структура подхватывается; обновить glob-pattern если нужно.

## Не делается в этом ТЗ

- Реализация contract-extract'а (runtime vs build-time) — решение studio-side в catalog-модуле.
- Backfill всех 13+ primitives — только Button + Card как эталоны.
- Изменения в studio'шном subpath `/manifests` — это совместимая обёртка, после расширения `IPrimitiveManifestEntry` всё работает.

## Связанная документация

- `packages/web/kit/ui/src/manifest/types.ts` — текущий shape.
- `docs/_meta/web-ui.md` — AI-anchor kit'а (обновить раздел manifest после расширения).
- `STUDIO-CATALOG-BRIEF-architect.md` — параллельный бриф архитектору (composition rule + ADR на расширение).
- ADR 048 — docs-as-data (источник docsRefs slug'ов).

## Очерёдность

1. Ждать ADR от архитектора (формальное закрепление shape + composition rule).
2. После ADR — задачи 1+2+3 одним PR (или последовательно: shape → backfill Button/Card → co-location, если хочется маленькими PR'ами).
3. Релиз — стандартная группа `web_base`.
