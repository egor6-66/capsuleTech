---
title: Grid
status: documented
type: primitive
audience: dev
tags: [web-ui, primitive, layout, grid, container]
last_updated: 2026-07-02
slug: web-ui/primitives/layout/grid
---

# Grid {#grid}

Низкоуровневая CSS Grid-обёртка `@capsuletech/web-ui` в духе Mantine/Chakra. Управляет треками (`cols` / `rows`), gap'ом и именованными областями (`areas`). Все динамические значения применяются через inline-`style` — не упирается в Tailwind purge у консьюмера. Пустой контейнер автоматически получает `min-height: var(--size-slot)` — остаётся видимым и droppable в редакторе.

> Импорт: `import { Grid } from '@capsuletech/web-ui/grid';`

## Когда использовать {#usage}

- **Двумерные сетки** — карточные дашборды, галереи, формы в N колонок, page-layout через `areas`.
- **Не использовать** для одномерных потоков (строка/колонка) — для этого есть `Flex`.
- **Не использовать** для resize-сплиттеров — для этого есть `Layout.Resizable`.

## Props {#props}

| Prop | Type | Default | Назначение |
|---|---|---|---|
| `cols` | `number \| string \| string[]` | — | `grid-template-columns`. Число N → `repeat(N, minmax(0,1fr))`; массив — join(' '); строка — как есть |
| `rows` | `number \| string \| string[]` | — | `grid-template-rows`. Те же правила |
| `gap` | `number \| string` | — | Все gaps. Число × 0.25rem (как Tailwind); строка — сырое CSS / токен |
| `gapX` / `gapY` | `number \| string` | — | `column-gap` / `row-gap` независимо |
| `areas` | `string[]` | — | `grid-template-areas`: каждый элемент — одна строка без кавычек |
| `autoFlow` | `'row' \| 'column' \| 'dense' \| …` | — | `grid-auto-flow` |
| `autoRows` / `autoCols` | `string` | — | `grid-auto-rows` / `grid-auto-columns` |
| `inline` | `boolean` | — | `display: inline-grid` вместо `grid` |
| `as` | `ValidComponent` | `'div'` | Полиморфный тег (runtime-only) |
| `class` | `string` | `'w-full'` (манифест) | CSS-класс на корневой элемент |
| `style` | `JSX.CSSProperties` | `{ padding: 'var(--space-card)' }` (манифест) | Инлайн-стили; мержатся с computed grid-стилями |

Все прочие HTML-атрибуты прокидываются на корневой элемент через spread.

## Треки {#tracks}

```tsx
<Grid cols={3} gap={4}>…</Grid>                              {/* 3 равные колонки */}
<Grid cols="200px 1fr 200px" rows={['auto', '1fr', 'auto']}> {/* смешанные треки */}
<Grid cols="repeat(auto-fill, minmax(120px, 1fr))" gap={2}>  {/* адаптивная галерея */}
```

`repeat(auto-fill, minmax(…))` — responsive-сетка без media-queries: колонки добавляются/убираются под ширину контейнера.

## Области (areas) {#areas}

```tsx
<Grid areas={['header header', 'sidebar main']} cols="200px 1fr">
  <Grid.Item area="header"><Header /></Grid.Item>
  <Grid.Item area="sidebar"><Sidebar /></Grid.Item>
  <Grid.Item area="main"><Main /></Grid.Item>
</Grid>
```

## Grid.Item {#item}

Опциональная обёртка над дочерним блоком — декларативный API вместо ручного `style={{ 'grid-area': … }}`:

| Prop | Назначение |
|---|---|
| `span` / `rowSpan` | `grid-column: span N` / `grid-row: span N` |
| `colStart` / `colEnd` / `rowStart` / `rowEnd` | Явные линии |
| `area` | Имя области из `areas` родителя |

Без Item grid-позиционирование можно задавать напрямую через `style` на любом теге.

## Пустой контейнер {#empty-container}

Если `children` не переданы, контейнер получает `min-height: var(--size-slot)` через inline-style — видим и droppable в UI-редакторе без Tailwind content-scan. Явный `min-height` в `style` переопределяет fallback.

## Доступность {#a11y}

Grid не несёт собственной семантики. Для семантических контейнеров используй `as` (`as="section"` + `aria-label`, `as="ul"` для списковых сеток). Порядок чтения screen-reader'ом = DOM-порядок, не визуальный — не переставляй смысловые блоки через `areas` вопреки порядку в разметке.

## Tokens / стили {#tokens}

<!-- audience: agent,dev -->
- `--space-component` — дефолтный gap в манифесте (density-aware шаг).
- `--space-card` — дефолтный padding в манифесте.
- `--size-slot` — min-height пустого контейнера в редакторе.
- Треки/gap применяются inline — Tailwind purge не участвует; база (`grid` / `inline-grid`) идёт классом.
<!-- /audience -->

## Контракт для studio {#contract}

<!-- audience: agent -->
`grid.contract.ts` описывает `cols` / `rows` / `gap` / `gapX` / `gapY` / `autoFlow` / `inline` в zod-схеме для studio inspector. `areas` / `autoRows` / `autoCols` — advanced, в палитра-контракт не входят (задаются через style). `as` и `class` / `style` — inspector-only, расширяются в `propsSchema` манифеста.

Пресеты палитры (`grid.presets.ts`) наполнены шестью нейтральными плитками (`ui.Layout.Flex`) — кручение `cols` / `gap` в инспекторе реально перестраивает сетку.
<!-- /audience -->

## Связанное {#related}

- [[web-ui/primitives/layout/flex|Flex]] — одномерные потоки, сосед по `layout/`.
- [[web-ui/primitives/card|Card]] — типовой ребёнок grid-ячейки.
- [[web-ui/primitives/layout/resizable|Layout.Resizable]] — resize-сплиттеры.
