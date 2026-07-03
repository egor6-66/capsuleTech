---
title: web-ui — гэп: нет content-width wrap batch-layout (List/Group)
status: ready
audience: owner-сессия `claude-scope -Scope ui` (commit-only, без push)
last_updated: 2026-07-03
adr_refs: [036]
---

# Часть 1 — content-width wrap (РЕШЕНО, `feat(ui): List batch wrap mode`)

Закрыто owner-ui коммитом `8151cfa9`: `List` batch `wrap?: boolean` рендерит
`display:flex; flex-wrap:wrap` с `shrink-0`-обёрткой на item — тайлы разной
ширины больше не растягиваются до `1fr`. `apps/learn/src/shapes/wordTiles.tsx`
переключён на `wrap: true` (было `min: '9rem'`).

# Часть 2 — НОВЫЙ гэп: wrap-режим не центрирует ряд (нужен `justify`/`align`)

**Симптом:** после Части 1 тайлы не растянуты, но весь ряд прибит к левому
краю контейнера (`justify-content` не задан → браузерный дефолт
`flex-start`). Консьюмер (learn) уже пробовал `align: 'center'` в Shape-config
`Shapes.WordTiles` — **не работает**: `IListBatchProps` не объявляет `align`/
`justify`, проп улетает в `others` → `list.tsx`'s wrap-ветка (`list.tsx:78-90`)
спреит его как raw HTML-атрибут на `<ul>`. `align` — obsolete-атрибут, валиден
для `div/p/table/hr/img/...`, но **не для `ul`** → браузер его игнорирует, ноль
эффекта.

**Требование:** в `wrapStyle()` (`list.tsx:70-76`) добавить `justify-content`
из нового пропа (например `justify?: 'start'|'center'|'end'` — паритет с
`Flex`'s `FlexJustify`, дефолт `'start'` = текущее поведение, не breaking).
Прокинуть через `splitProps`-список вместе с остальными wrap-полями
(`list.tsx:32-36`).

**Затронутый консьюмер:** `apps/learn/src/shapes/wordTiles.tsx` — `align:
'center'` уже стоит в Shape-конфиге (ждёт, пока проп начнёт что-то делать);
после фикса owner-apps переименует в правильное имя пропа, если оно будет
отличаться от `align`.

# Acceptance (Часть 2)

- `justify` (или согласованное имя) реально центрирует/выравнивает ряд(ы) в
  wrap-режиме `List`; тест на N items с разной шириной → ряд по центру
  контейнера при `justify='center'`, дефолт не ломает существующее поведение.
- README/manifest/presets обновлены.
- `pnpm exec biome check packages/web/kit/ui --write` перед сдачей.

---

# Симптом (learn, Shapes.WordTiles) — исходный, часть 1

Сетка слов (`apps/learn/src/shapes/wordTiles.tsx`) визуально «поехала»: тайлы
растянуты до равной ширины колонки вместо контентной ширины (текст разной
длины → тайлы должны быть разной ширины и переноситься по строкам, как чипы).

# Корень — ни один существующий batch-примитив не даёт flex-wrap+content-width

**`List` batch-режим** (`packages/web/kit/ui/src/primitives/list/list.tsx`):
- с `min` → CSS Grid `grid-template-columns: repeat(auto-fit, minmax(min, 1fr))`.
  `1fr` **растягивает** все items до равной ширины колонки — это и есть баг
  («поехали»), не content-width.
- без `min` → обычный flex (`listVariants`: `orientation: horizontal` →
  `flex-row gap-2 items-center`). В `listVariants` (`list/variants.ts`) **нет
  `wrap`-варианта вообще** — ни класса `flex-wrap`, ни соответствующего
  CVA-variant'а. Overflow по горизонтали без переноса.

**`Group` batch-режим** (`packages/web/kit/ui/src/primitives/group/group.tsx`):
`isBatch()` всегда уходит в один из двух путей — `attached && !resizable` (рендер
через `<For>` с seam-стилями для toolbar'ов) или **`<Resizable>`** (`spaced`/
`resizable` — пропорциональные resize-панели через corvu). Ни один путь не
рендерит через `<Flex wrap="wrap">` — хотя `Flex` (низкоуровневый примитив)
`wrap`-проп **уже имеет** (`FlexWrap = 'wrap'|'nowrap'|'wrap-reverse'`,
`flex.tsx:25-29,139`), `Group.tsx`'s `splitProps` (строка ~40-52) его даже не
забирает из props — контейнер под children (wrapper-mode) жёстко без wrap.

# Требование

Нужен batch-режим (в `List`, либо новый вариант в `Group`), который:
- рендерит items через `<Flex wrap="wrap">` (или эквивалент) — **content-width**
  (`shrink-0`/`w-fit` на item, НЕ `1fr`-стретч);
- принимает `gap`;
- НЕ уходит в `Resizable` (это для resize-панелей, другой use-case).

Кандидат: третий вариант rendering-пути в `List` batch-mode рядом с
`min`(grid) — например `wrap?: boolean` (или `layout: 'grid'|'wrap'`), который
рендерит `<Flex wrap="wrap" gap={...}>` с `<For>` вместо grid/single-row.
Финальное API — на усмотрение owner-ui (значения/наименование пропа), суть
контракта фиксирована выше.

# Затронутый консьюмер

`apps/learn/src/shapes/wordTiles.tsx` — временно оставлен `min: '9rem'`
(известная регрессия, задокументирована GAP-комментарием в файле). После
фикса owner-apps переключит на новый режим (без `min`) — это НЕ requires app
side changes beyond swapping the prop.

# Acceptance

- Новый batch-режим (List и/или Group) даёт content-width wrap-layout,
  покрыт тестом (N items разной длины текста → не растянуты до равной ширины,
  переносятся по строкам при сужении контейнера).
- README/manifest/presets обновлены по эталон-тройке.
- `pnpm exec biome check packages/web/kit/ui --write` перед сдачей.
- Изменения только в `packages/web/kit/ui/**`.
