---
title: Flex
status: documented
type: primitive
audience: dev
tags: [web-ui, primitive, layout, flex, container]
last_updated: 2026-06-20
slug: web-ui/primitives/layout/flex
---

# Flex {#flex}

Низкоуровневая Flexbox-обёртка `@capsuletech/web-ui`. CSS-flex-контейнер: принимает любых детей, управляет направлением, выравниванием и gap'ом. Пустой контейнер автоматически получает `min-height: var(--size-slot)` — остаётся видимым и droppable в редакторе.

> Импорт: `import { Flex } from '@capsuletech/web-ui/flex';`

## Когда использовать {#usage}

- **Любой layout-контейнер** — строки, колонки, обёртки форм, toolbar, header, sidebar.
- **Не использовать** для табличных сеток с выравниванием по обеим осям — для этого есть `Grid`.
- **Не использовать** для resize-сплиттеров — для этого есть `Layout.Resizable`.

## Props {#props}

| Prop | Type | Default | Назначение |
|---|---|---|---|
| `orientation` | `'horizontal' \| 'vertical'` | — | Shortcut: horizontal = row, vertical = col |
| `direction` | `'row' \| 'row-reverse' \| 'col' \| 'col-reverse'` | — | `flex-direction` |
| `wrap` | `'wrap' \| 'nowrap' \| 'wrap-reverse'` | — | `flex-wrap` |
| `align` | `'start' \| 'center' \| 'end' \| 'stretch' \| 'baseline'` | — | `align-items` |
| `justify` | `'start' \| 'center' \| 'end' \| 'between' \| 'around' \| 'evenly'` | — | `justify-content` |
| `gap` | `number \| string` | — | Общий gap. Число × 0.25rem; строка — сырое CSS |
| `gapX` | `number \| string` | — | `column-gap` (override для gap по горизонтали) |
| `gapY` | `number \| string` | — | `row-gap` (override для gap по вертикали) |
| `inline` | `boolean` | — | `display: inline-flex` вместо `flex` |
| `h` | `number \| 'full'` | — | `height` через spacing-шкалу или 100% |
| `minH` | `number` | — | `min-height` через spacing-шкалу |
| `maxH` | `number` | — | `max-height` через spacing-шкалу |
| `w` | `number \| 'full'` | — | `width` через spacing-шкалу или 100% |
| `minW` | `number` | — | `min-width` через spacing-шкалу |
| `maxW` | `number` | — | `max-width` через spacing-шкалу |
| `fluid` | `number` | — | `flex: 1 1 Npx` — responsive basis |
| `p` | `number` | — | `padding` (все стороны) через spacing-шкалу |
| `px` | `number` | — | `padding-inline` (left+right) через spacing-шкалу |
| `py` | `number` | — | `padding-block` (top+bottom) через spacing-шкалу |
| `overflow` | `'auto' \| 'hidden'` | — | Скролл-контейнеры: `overflow-auto` / `overflow-hidden` |
| `border` | `'t' \| 'b' \| 'l' \| 'r' \| 'x' \| 'y' \| 'all'` | — | Chrome-разделитель по токену `border-border` |
| `as` | `ValidComponent` | `'div'` | Полиморфный тег (runtime-only) |
| `class` | `string` | `'w-full'` | CSS-класс на корневой элемент |
| `style` | `JSX.CSSProperties` | `{ padding: 'var(--space-card)' }` | Инлайн-стили на корневой элемент |

Все прочие HTML-атрибуты прокидываются на корневой элемент через spread.

## Режимы {#modes}

### CSS-flex с children

Базовый режим — передавай `children` как обычно:

```tsx
<Flex direction="col" gap={2}>
  <span>Первый</span>
  <span>Второй</span>
</Flex>
```

### Для resize-раскладок

Используй `Layout.Resizable` — отдельный примитив с handle'ами и изменяемыми размерами:

```tsx
<Layout.Resizable items={[{ content: <Panel />, size: 0.3 }, { content: <Main /> }]} />
```

## Gap-токены {#gap-tokens}

`gap` принимает число (единица spacing-шкалы, 1 = 0.25rem, паритет с Tailwind) или CSS-строку с токеном:

```tsx
<Flex gap={2}>…</Flex>                           {/* gap: 0.5rem */}
<Flex gap="var(--space-component)">…</Flex>      {/* gap через CSS-переменную */}
<Flex gapX={4} gapY={2}>…</Flex>                {/* column-gap/row-gap независимо */}
```

Дефолт из `defaultProps` манифеста: `gap='var(--space-component)'` — стандартный шаг между компонентами в капсульном приложении.

## Sizing-шкала {#sizing}

Числовые props (`h`, `minH`, `maxH`, `w`, `minW`, `maxW`) работают как Tailwind spacing-шкала: `h={10}` ≡ `h-10` ≡ `height: calc(var(--spacing) * 10)`. Применяются через inline-style, без Tailwind content-scan.

```tsx
<Flex h={20} minH={6} maxH={40}>…</Flex>
<Flex h="full">…</Flex>          {/* height: 100% */}
<Flex fluid={320}>…</Flex>       {/* flex: 1 1 320px */}
```

`'full'` — 100% по соответствующей оси (паритет с Tailwind `h-full` / `w-full`).

`p`/`px`/`py` следуют тому же паритету для padding: `p={4}` ≡ `p-4` ≡ `padding: calc(var(--spacing) * 4)`; `px`/`py` — `padding-inline`/`padding-block`.

```tsx
<Flex p={4}>…</Flex>             {/* padding: 1rem */}
<Flex px={4} py={2}>…</Flex>     {/* padding-inline/padding-block независимо */}
<Flex overflow="auto" maxH={80}>…</Flex>   {/* скролл-контейнер */}
<Flex border="b">…</Flex>        {/* border-b border-border — chrome-разделитель */}
```

## Пустой контейнер {#empty-container}

Если `children` не переданы (или `null`/пустой массив), контейнер получает `min-height: var(--size-slot)` через inline-style. Это делает его видимым и droppable в UI-редакторе без зависимости от Tailwind purge у потребителя. Явный `minH` переопределяет этот fallback.

## Полиморфизм {#polymorphic}

`as` позволяет изменить корневой тег без потери стилей:

```tsx
<Flex as="nav" direction="row" gap={2}>…</Flex>
<Flex as="section" direction="col">…</Flex>
<Flex as="ul" direction="col" gap={1}>…</Flex>
```

`as` — runtime-only prop, в контракт не входит.

## Доступность {#a11y}

Flex не несёт собственной семантики. Для семантических контейнеров используй `as`:

- `as="nav"` — навигационный блок
- `as="section"` — секция документа (рекомендуется `aria-label`)
- `as="header"` / `as="footer"` — шапка/подвал секции
- `as="ul"` + `as="li"` у детей — списки

Flex + children ничего не добавляет сам — всё a11y-значение несут потомки или тег через `as`.

## Tokens / стили {#tokens}

<!-- audience: agent,dev -->
- `--space-component` — дефолтный gap в манифесте (шаг между компонентами формы/секции).
- `--space-card` — дефолтный padding в манифесте (отступ карточки/секции).
- `--size-slot` — min-height пустого контейнера в редакторе (droppable-зона).
- `--spacing` — базовая единица spacing-шкалы (× N для числовых sizing-props).
<!-- /audience -->

## Slots / hooks {#slots}

Data-атрибутов у Flex нет. Для тест-селектора используй класс корневого элемента или `data-testid` на самом `<Flex>` через spread.

## Контракт для studio {#contract}

<!-- audience: agent -->
`flex.contract.ts` описывает CSS-flex props + sizing в zod-схеме для studio inspector: `orientation`, `direction`, `wrap`, `align`, `justify`, `gap`, `gapX`, `gapY`, `inline`, sizing-шкала, `p`/`px`/`py`, `overflow`, `border`. `rule.styleSlots(['root'])` — одна корневая зона стилей.

`as` и `class`/`style` не входят в контракт — они inspector-only поля, расширяемые в `propsSchema` манифеста через `baseProps.extend(...)`.

Items/resize props (из старого режима) больше не часть Flex — они живут в `Layout.Resizable` со своим контрактом.
<!-- /audience -->

## Связанное {#related}

- [[web-ui/primitives/layout/grid|Grid]] — CSS Grid с областями, сосед по `layout/`.
- [[web-ui/primitives/card|Card]] — один из частых детей Flex-контейнера.
- [[web-ui/primitives/layout/resizable|Layout.Resizable]] — resize-сплиттеры (бывший items-mode).
