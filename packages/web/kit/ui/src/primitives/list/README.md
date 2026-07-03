---
title: List
status: documented
type: primitive
audience: dev
tags: [web-ui, primitive, list, container]
last_updated: 2026-07-02
slug: web-ui/primitives/list
---

# List {#list}

Списковый примитив `@capsuletech/web-ui` с тремя режимами: семантический (`<ul>` с plain children), batch (`data` + `item.use` — Shape-first итерация через `<For>`) и render-prop (classic `items` + функция). Ориентация вертикальная/горизонтальная, вариант `flush` для edge-to-edge вложения.

> Импорт: `import { List } from '@capsuletech/web-ui/list';`

## Когда использовать {#usage}

- **Однородные ряды данных**: меню навигации, списки настроек, результаты поиска, ленты.
- **Не использовать** для группы контролов (segmented-кнопки, toolbar) — для этого есть `Group`.
- **Не использовать** для табличных данных с колонками — для этого есть `DataTable` / `Table`.

## Props {#props}

Общие для всех режимов:

| Prop | Type | Default | Назначение |
|---|---|---|---|
| `orientation` | `'vertical' \| 'horizontal'` | `'vertical'` | Ось списка |
| `variant` | `'default' \| 'flush'` | `'default'` | default — с padding/gap; flush — `p-0 gap-0` (edge-to-edge для вложения в Card/Panel) |
| `class` / `style` | `string` / `JSX.CSSProperties` | — | Прокидываются на корневой элемент |

Режимные (union-типы, взаимоисключающие):

| Prop | Режим | Назначение |
|---|---|---|
| `children` (JSX) | semantic | Plain children, без итерации; рендерит `<ul>` |
| `data` + `item` | batch | `item.use` — компонент-шаблон, `item.props` — маппер данных → props (ADR 036 §3); `<For>` внутри, рендерит `<ul>` |
| `min` / `gap` | batch | `min` включает responsive CSS Grid (`repeat(auto-fit, minmax(min, 1fr))`); `gap` — шаг сетки (default `0.5rem`) |
| `wrap` / `gap` | batch | `wrap` включает content-width flex-wrap (`display: flex; flex-wrap: wrap`, каждый item в `shrink-0` `<li>`) — НЕ `1fr`-стретч, items сохраняют естественную ширину и переносятся по строкам; `gap` — тот же шаг (default `0.5rem`). Приоритет над `min`, если заданы оба |
| `items` + `children`-функция | render-prop | Classic `(item, idx) => JSX`; рендерит `<div>` |

## Режимы {#modes}

### Semantic {#semantic}

```tsx
<List variant="flush">
  <li>Первый</li>
  <li>Второй</li>
</List>
```

### Batch (Shape-first) {#batch}

```tsx
<List data={rows} item={{ use: NavItem, props: (it) => ({ label: it.label }) }} />
<List data={cards} item={{ use: Card }} min="116px" gap="0.5rem" />  {/* responsive grid, equal-width columns */}
<List data={tags} item={{ use: Card }} wrap gap="0.5rem" />          {/* content-width, wraps to new lines */}
```

`min` (grid) stretches every item to fill its column (`1fr`) — use it for uniform-size tiles/cards. `wrap` (flex) keeps each item at its natural content width and wraps when the row is full — use it for tag/chip/word grids where items have varying text length (mixing them was the root cause of a reported "tiles drifted to equal width" regression in `apps/learn`).

### Render-prop (classic) {#render-prop}

```tsx
<List items={users}>{(user) => <UserRow user={user} />}</List>
```

Backward compat: существующий код с `items + children` продолжает работать.

## List.Virtual {#virtual}

Виртуализированный вариант для длинных списков (`@tanstack/solid-virtual`):

```tsx
<List.Virtual items={rows} estimateSize={36}>
  {(row) => <UserRow user={row} />}
</List.Virtual>
```

Принимает `items` + render-функцию + `estimateSize` (px на строку) и общие `orientation` / `variant`.

## Доступность {#a11y}

Semantic и batch режимы рендерят `<ul>` — нативная списковая семантика. Render-prop режим рендерит `<div>` (легаси) — для семантики предпочитай batch/semantic. Интерактивные строки делай элементами `<button>`/`<a>` внутри строк, а не onClick на div.

## Tokens / стили {#tokens}

<!-- audience: agent,dev -->
- Строки: `px-cell py-cell-tight` (density-aware) + `rounded-md`, переход `transition-colors duration-200`.
- Hover/active — токены темы (`bg-accent`, `bg-primary`, `bg-muted`).
- `flush` убирает собственный padding/gap контейнера — плотность отдаётся родителю (Card.Content и т.п.).
<!-- /audience -->

## Контракт для studio {#contract}

<!-- audience: agent -->
`list.contract.ts` описывает `orientation` / `variant` / `wrap` в zod-схеме для studio inspector. Палитра использует СЕМАНТИЧЕСКИЙ режим (plain children-ноды); batch (включая `min`/`wrap`) и render-prop — runtime-режимы, в сериализуемый контракт не входят полностью (за исключением `wrap`, добавленного как boolean-поле для будущей batch-палитры). `class` — inspector-only, расширяется в `propsSchema` манифеста.
<!-- /audience -->

## Связанное {#related}

- [[web-ui/primitives/group|Group]] — группа контролов (не данные).
- [[web-ui/primitives/card|Card]] — типовой контейнер вокруг flush-списка.
- [[web-ui/primitives/button|Button]] — типовая строка навигационного списка (batch `use: Button`).
