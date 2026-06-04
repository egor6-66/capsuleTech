---
tags: [hca, adr, accepted]
status: accepted
date: 2026-06-05
---

> [!info] Status
> **Accepted (направление)** — 2026-06-05. Решена **гранулярность** code-splitting; конкретный chunking-механизм (a/b/c ниже) финализирует owner-builders в фазе 1 (Rolldown-специфика, Vite 8). Эмпирическое основание — build ewc от 2026-06-05 (см. ## Контекст). Реализация по фазам, каждая — отдельный PR через owner'а.

# ADR 034 — Гранулярность code-splitting: lazy по route + heavy-leaf, eager для остальных слоёв

## Контекст

[`CapsuleRegistryPlugin`](packages/builders/vite/src/plugins/capsuleRegistry.ts) генерит `.capsule/registry/wrappers.ts`, где **каждый** Widget / View / Shape / Feature обёрнут в `lazy(() => import(...))`. Entity — eager (синхронный config для `z.infer`/`.parse`). Pages в этом реестре **нет** — они route-lazy отдельно, через RouterPlugin → TanStack.

**Почему так сейчас:** реестр — это один модуль, грузящийся на bootstrap и ссылающийся на каждый компонент через глобал. Будь записи eager (`import X from …`), импорт реестра статически втянул бы **весь app в bootstrap-чанк**. `lazy()` на каждой записи — способ этого избежать. То есть lazy-everywhere — **следствие паттерна «глобальный реестр без импортов»**, а не осознанный перф-выбор по слоям.

**Проблема — over-splitting + waterfall:**

1. Доступ к слоям идёт по строковому пути-глобалу (`Widgets.Tables.Incidents`), резолв в **рантайме** → бандлер не видит граф статически → **не может preload/parallelize**.
2. Рантайм: `page` → дёргает lazy `widget` → фетч → рендерится → дёргает lazy `shape` → ещё фетч → … **серийный водопад** + Suspense-флэш на каждом слое.
3. **Route-split уже есть** (pages). Per-layer lazy — это **второй сплит ВНУТРИ уже-сплитнутого роута**, добавляющий водопад почти без выгоды.

**Эмпирика (build `apps/ewc`, Vite 8 / Rolldown, 2026-06-05).** ~44 JS-чанка. Реальный вес — 4, и 3 из них грузятся upfront в любом случае:

| чанк | raw | gzip |
|---|---|---|
| `index` | 280 kB | 85.6 |
| `vendor-core` (solid/xstate/router) | 176 kB | 59.0 |
| `vendor-ui` (kobalte/…) | 122 kB | 37.8 |
| `dataTable` | 62 kB | 17.2 |

Остальные **~39 чанков — это per-layer `lazy`, почти все <2 kB, большинство <0.75 kB**: `markersList` 0.13 · `world` 0.37 · `main`(sidebar) 0.38/0.53 · `incidents` 0.61/1.80 · `incidentsTable` 0.74 · `incidentPreview` 0.75 · `tableSync`/`mapSync` 0.68 · `dashboard` 0.75 · `navigation` 0.66 · `auth` 0.84 · … + UI-kit отдельными чанками: `dropdown` 2.19 · `select` 3.03 · `tooltip` 1.61 · `previewCard` 1.51 · `darkModeToggle` 0.73 · …

**Итог:** ~23 kB логики приложения раздроблены на ~39 lazy-чанков. **Экономии размера ноль** (инишл всё равно ~580 kB index+vendors), а цена — десятки waterfalled-фетчей + флэш на каждом слое. Чанк <0.75 kB — это не code-splitting, а оверхед: заголовки запроса + Suspense-машинерия в разы больше payload'а.

## Решение

**Гранулярность lazy = route + тяжёлый leaf. Остальные слои — eager в чанке роута.**

1. **Route / Page — lazy** (как сейчас, RouterPlugin → TanStack). Без изменений. Это даёт основную пользу splitting'а — не грузить чужие роуты.
2. **Тяжёлый leaf — lazy, opt-in.** Порог по gzip-размеру (ориентир: десятки kB, не сотни байт). Канонический пример — `dataTable` (62 kB / 17 gzip). Кандидаты: тяжёлый редактор (`web-ui-creator`), карта, чарты. Включается **маркером** (см. механизм), не по дефолту.
3. **View / Shape / большинство Widget / Feature — eager.** Едут в чанке своего роута (бандлер co-locate'ит через статический граф / chunking). Никаких отдельных микро-чанков, никакого intra-route водопада.
4. **Entity — eager** (без изменений; синхронный config).

### Механизм (owner-builders; детали и выбор a/b/c — за ним)

Кодген `wrappers.ts` перестаёт blanket-`lazy()`, дефолт — **eager-импорт**. Проблема «eager-реестр втянет всё в `index`» решается **не** через lazy-per-entry, а через **chunking по роут-границам**:

- **(a) per-route registry subset** — кодген генерит реестр так, что бандлер видит его как route-граф (каждый роут статически импортит свои слои);
- **(b) единый eager-реестр + Rolldown `manualChunks`/`advancedChunks`** — раскладка по роут-границам на стороне бандлера;
- **(c) hybrid** — дефолт eager, `lazy` остаётся **opt-in per-entry** через маркер «heavy».

Opt-in lazy для heavy leaf (п.2) — маркер, который кодген читает и оборачивает в `lazy()`: экспорт-флаг в компоненте / конвенция / поле в app-config. Конкретику выбирает owner-builders (зависит от Rolldown на Vite 8, ADR 033).

## Альтернативы

- **A. Оставить lazy-everywhere.** Отвергнут эмпирикой: ~23 kB раздроблены на ~39 чанков → водопад + флэш без экономии размера.
- **B. Полностью eager, включая heavy leaf.** Отвергнут: `dataTable` 62 kB и редактор/карта реально тяжёлые — грузить их на роутах, где не нужны, это bloat. Heavy-leaf lazy окупается.
- **C. Только авто-эвристика бандлера (Rolldown manualChunks по размеру), без правок кодгена.** Частично — помогает группировать, но не убирает рантайм-резолв глобалов (бандлер всё равно не видит, что роут юзает конкретный слой). Возможна как часть механизма (b), но сама по себе проблему waterfall'а не закрывает.

## Последствия

### Положительные
- Рендер роута — без серийного водопада микро-чанков; меньше Suspense-флэша (тот же [[029-widget-frame-chrome|skeleton-разговор]] — slot-skeleton/chunk-load становится почти не нужен).
- Бандлер видит статический граф роута → preload / parallel.
- Heavy-leaf (`dataTable`) остаётся вынесенным — где не нужен, не грузится.

### Отрицательные
- Чанк роута крупнее — но это ровно то, что роут и так рендерит синхронно.
- Кодген усложняется (route-aware chunking / opt-in lazy-маркер).
- Нужна **верификация после**: re-build ewc + сравнить chunk-граф с baseline (этот build) + желательно рантайм-network в браузере (водопад исчез?).

## План (фазы; каждая — свой PR через owner'а)

1. **owner-builders — investigation.** Rolldown chunking на Vite 8 (`manualChunks`/`advancedChunks`), выбор механизма (a/b/c). Прототип на ewc, diff chunk-графа против baseline 2026-06-05.
2. **owner-builders — реализация.** `CapsuleRegistryPlugin`: eager-дефолт + route-aware chunking + opt-in lazy-маркер для heavy leaf. Тесты кодгена.
3. **app (ewc) + owner-tests — верификация.** Re-build, сравнить чанки, рантайм-network в браузере (нет серийного водопада), smoke.
4. **heavy-leaf маркировка** (отдельно): `dataTable` → lazy; опц. редактор / карта.

## Связанное

- [[033-package-registration|ADR 033]] — тот же кодген-плагин, Vite 8 / Rolldown (общий контекст бандлинга).
- [[019-autoimport-dirs-drop|ADR 019]] — история реестра/кодгена слоёв.
- [[010-builders-split|ADR 010]] — структура builders.
- **Смежное наблюдение (не в скоупе):** `index` 280 kB подозрительно жирный — проверить визуалайзером, не тянется ли `web-ui-creator`/редактор eager'ом в дашборд-инишл. Отдельный спот.
