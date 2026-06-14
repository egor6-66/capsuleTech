# Feedback owner-studio → архитектор по ADR 049

**Источник:** ADR 049 «Studio Catalog composition + manifest extension», status: proposed.
**Вердикт:** approve-ready. Покрывает оба брифа (architect + owner-web-ui) и добавляет проработку D6/D7/D8. Ниже — точечные правки до approve.

## Блокеры (3) — нужно зафиксировать до approval

### 1. D3 — Namespace событий неоднозначен

**Проблема.** В тексте D3 события записаны как `palette.onSelect`, `variants.onCreateCustom`. Это можно прочитать двумя способами:

- (a) **Catalog — один package-emitter**, события сгруппированы namespace'ом в имени.
- (b) **Каждый модуль — независимый emitter**, события плоские внутри модуля.

Разница влияет на форму `Catalog.Events` union, который owner-studio пишет, и на то, как app ловит:

```ts
// (a) single emitter:
type Catalog.Events = {
  'palette/onSelect': { type: string };
  'variants/onCreateCustom': { type: string; name: string; props: Record<string, unknown> };
  // ...
};
const Cat = Feature<Catalog.Events>((api) => ({ /* ... */ }));

// (b) per-module emitters:
type Palette.Events = { onSelect: { type: string } };
type Variants.Events = { onCreateCustom: { ... } };
// app пишет Feature на каждый отдельно
```

**Предложение.** Зафиксировать в D3 вариант (a): **catalog — один package-emitter, события неймспейсятся через `<module>/<event>` (slash-separated)**.

Аргументы:
- Catalog **один subpath** (см. блокер №3) — логически один package-эмиттер.
- App пишет одну Feature, ловит весь catalog — меньше boilerplate.
- Когда логика app решает «при клике в палитре сбросить inspector» — у неё уже всё в одном handler-наборе, не надо координировать два Feature.

**Конкретный текст в D3 (предлагаю):**

> Catalog — единый package-emitter. События неймспейсятся через `<module>/<event>` (slash-separated), e.g. `'palette/onSelect'`, `'variants/onCreateCustom'`. App ловит как `Feature<Catalog.Events>` (одна Feature на весь catalog). Type union `Catalog.Events` экспортируется из `@capsuletech/studio/catalog`.

### 2. D5 — Где живёт `contract.propsType`

**Проблема.** D5 определяет `contract.propsType: 'IButtonProps'` как «имя строкой» для contract-модуля. Не зафиксировано, **где** этот type экспортирован и как resolver его найдёт. Это критично для будущей миграции с runtime introspection (D6 MVP) на build-time type-extract — последний должен знать subpath, чтобы парсить правильный `.d.ts`.

**Предложение.** Зафиксировать convention в D5: **`contract.propsType` (и `slotsType`, `eventsType`) — имя type'а, экспортируемого из того же subpath, что компонент (т.е. из `manifest.subpath`).**

Пример для Button:
```ts
// manifest:
{ subpath: '@capsuletech/web-ui/button', contract: { propsType: 'IButtonProps' } }

// resolver:
import type { IButtonProps } from '@capsuletech/web-ui/button';
```

**Конкретный текст в D5 (предлагаю добавить под `contract?: {...}`):**

> **Convention.** Типы (`propsType` / `slotsType` / `eventsType`) — имена type/interface, экспортируемые из того же subpath, что и компонент (т.е. из `manifest.subpath`, auto-derived). На MVP (D6) поле informational; в будущем type-extract резолвит через `import type { ${propsType} } from '${manifest.subpath}'`.

**Следствие для owner-web-ui:** компонент должен экспортировать одноимённый interface (e.g. `Button.tsx` → `export interface IButtonProps`). Большинство уже так делает; если нет — backfill при наполнении `contract`.

### 3. D2 — Где модули живут как файлы (один subpath vs много)

**Проблема.** D2 описывает 8 модулей, но не фиксирует, **как они экспортируются**:

- (a) **Один subpath**: `@capsuletech/studio/catalog` с named exports: `{ Palette, Preview, Inspector, ManifestView, BundleInfo, DocsPanel, Contract, Variants }`.
- (b) **Множество subpath'ов**: `@capsuletech/studio/catalog/palette`, `.../preview`, `.../inspector`, … (8 multi-entry build-targets).

Влияет на: `package.json` exports, multi-entry vite config, OWNERSHIP.md subpath-таблицу, событийный namespace (см. блокер №1).

**Предложение.** Вариант (a) — **один subpath с named exports**.

Аргументы:
- 8 subpath'ов раздувает build-config и API surface без выгод (модули небольшие, общий контракт).
- Если app использует только палитру — tree-shake по-прежнему работает (named exports tree-shakeable при ESM-сборке).
- Зеркалит D3 (catalog как единый emitter).
- Меньше surface — проще менять (модули могут перемигрировать между друг другом без публичного breakage).

**Конкретный текст в D2 (предлагаю добавить после списка модулей):**

> **Packaging.** Все 8 модулей экспортируются из единого subpath `@capsuletech/studio/catalog` named exports'ами (`Palette`, `Preview`, `Inspector`, `ManifestView`, `BundleInfo`, `DocsPanel`, `Contract`, `Variants`). Tree-shake обеспечивается ESM-сборкой; consumer импортит только нужное. Этот выбор зеркалит D3 (catalog = единый emitter).

## Желательные правки (2) — non-blocking

### 4. D5 — Связь `examples[0]` ↔ `defaultProps`

**Проблема.** ADR говорит «examples и defaultProps сосуществуют» + «examples[0] может совпадать с defaultProps». Не зафиксировано, рекомендуется ли согласовывать первый example с defaultProps. Это вопрос UX-предсказуемости: пользователь открывает catalog → видит «Default» вариант → его props должны соответствовать тому, что создастся при drag из палитры.

**Предложение.** Добавить ремарку в D5 (под `examples?`):

> **Convention.** Manifest НЕ enforce'ит согласование `examples[0].props` с `defaultProps`. Рекомендуется поддерживать `examples[0].props ≈ defaultProps` для UX-предсказуемости: пользователь видит «Default» вариант в variants-модуле такой же, как при создании ноды через палитру/DnD. Тесты согласованности — на усмотрение owner-web-ui.

### 5. Roll-out — ссылка на `docs/_meta/web-rework-plan.md`

**Проблема.** Section `## Roll-out` ссылается на `docs/_meta/web-rework-plan.md` — «Фазы после approval». Если файл не содержит секции под ADR 049 — ссылка повисает.

**Предложение.** Проверить, что файл существует и содержит блок для ADR 049 (или добавить блок при approval). Альтернативно — встроить фазы прямо в `## Roll-out` ADR 049, без внешней ссылки (сейчас 5 фаз уже перечислены, ссылка избыточна).

## Минорные ремарки (не требуют правки)

- **A1 playground (главный)** в roll-out — это **user**, не главный assistant (на случай, чтобы потом не путаться: пользователь сам делает страницу в playground). Можно явно написать «(пользователь)».
- **`styleSlots?: string[]`** в manifest — про **стили**, не про children-slots. Contract-модуль будет показывать оба раздельно (style-slots отдельно от type-slots). Не требует правки ADR, упомянуть при реализации.
- **Open question «`docsRefs` syntax»** правильно отдан на ADR 048 канон. В первой реализации catalog (owner-studio) — зафиксировать конкретный пример в коде после первого backfill (Button + Card).

## Итог

После применения **трёх блокеров (1, 2, 3)** ADR 049 готов к approve. Желательные правки (4, 5) можно или применить вместе, или оформить в первый PR owner-web-ui / owner-studio.

Если архитектор согласен с (1)/(2)/(3) — могу применить Edit'ы по конкретным секциям сам и кинуть на ревью.
