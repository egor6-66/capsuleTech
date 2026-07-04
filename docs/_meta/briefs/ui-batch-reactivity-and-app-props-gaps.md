---
title: web-ui — БАГ реактивности batch item.props + props-гэпы для app-слоёв (no raw class)
status: ready
audience: owner-сессия `claude-scope -Scope ui` (commit-only, без push)
last_updated: 2026-07-03
adr_refs: [036]
---

# Часть 1 — 🐛 БАГ: batch `item.props` не реактивен к props-изменениям потребителя

**Симптом (learn, Shapes.WordTiles):** клик по слову → первый выбранный тайл
навсегда `selected`, и его КОНТЕНТ меняется при выборе следующих слов (морфится
в текущее выбранное). Данные чистые (172 uniq id, стейт — плоский spread).

**Подозреваемый корень (диагноз architect, проверить):**
`group.tsx` batch-путь: `const getItemProps = local.item?.props ?? ...` —
захват маппера ОДИН РАЗ при сетапе (нереактивно к смене `props.item`), и
`batchItems = createMemo(() => visible().map(item => ({ children: <Dynamic ... {...getItemProps(item)} /> })))`
— JSX строится в memo и уезжает в `Resizable` готовым массивом: spread props
вычислен в момент memo, дальнейшая реактивность значений маппера потеряна/частична.
`list.tsx` batch-режим — проверить на тот же паттерн (learn переехал на
`ui.List` batch, баг воспроизводится там же).

**Требование:** в batch-режиме (`Group`, `List`, и все места по этому паттерну)
изменение результата `item.props(it)` (например `selected` от внешнего
`props.selectedId`) обязано реактивно доезжать до item-компонента без
пересоздания всего списка.

**Регрессионный тест (обязателен):** batch-рендер N items, item.props замыкается
на внешний signal `selectedId`; смена сигнала → у нового item проп selected=true,
у старого false; контент items не перемешан (ассерт по текстам).

# Часть 2 — props-гэпы: апп больше НЕ пишет raw class (канон user 2026-07-03)

Всё, что аппу нужно поверх текущих props — добавить пропсами (токены/CVA внутри
kit'а). Выявлено на learn (вычищено из app-кода, ждёт props):

1. **Card**: `interactive?: boolean` (cursor-pointer + hover-поверхность по токенам,
   НЕ ломая палитру) и `selected?: boolean` (выбранная поверхность; связка с
   `aria-selected`). Плюс `padding?: 'none'|'sm'|'md'` — тайлам/чипам нужен
   компактный padding.
2. **Flex (Layout.Flex)**: padding-пропсы по spacing-шкале (`p`, `px`, `py` —
   как уже сделано с `h`/`minH`/`w`), и `overflow?: 'auto'|'hidden'` для
   скролл-контейнеров.
3. **Badge/Chip примитив** (или Card padding='sm' + variant) — тег-чипы
   (`{name} · {kind}`) сейчас рисуются голой Card без отступов.
4. **Button**: размер меньше `sm` для inline-иконок в тексте (🔊 в тайле был
   `h-5 px-1 text-xs`) — например `size: 'xs'` или `size: 'inline'`.
5. **Flex**: border-проп (`border?: 'b' | 't' | ...` по токену `border-border`) —
   для chrome-разделителей (learn Navigation был raw `border-b`).

Канон: consumers configure via props only ([[feedback_primitives_props_only_no_raw_classes]]);
Tailwind сканит только kit — app-классы и так вне дизайн-системы.

# Acceptance

- Тест Части 1 зелёный + существующие 557.
- Новые props покрыты presets/manifest/README по эталон-тройке (как Avatar/Image).
- `pnpm exec biome check packages/web/kit/ui --write` перед сдачей (в прошлый раз 11 файлов уехали непроформаченными).
- Изменения только в `packages/web/kit/ui/**`.
