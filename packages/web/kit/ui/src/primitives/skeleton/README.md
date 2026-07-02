---
title: Skeleton
status: documented
type: primitive
audience: dev
tags: [web-ui, primitive, skeleton, loading]
last_updated: 2026-07-02
slug: web-ui/primitives/skeleton
---

# Skeleton {#skeleton}

Layout-сохраняющий placeholder загрузки `@capsuletech/web-ui`. Пять пресетов формы (`text` / `table` / `list` / `card` / `map`) с pulse-анимацией. Каждый блок-шард — `Skeleton.Root` из `@kobalte/core/skeleton` (a11y, `data-animate`/`data-visible`, `role="group"`); визуальный pulse и layout-пресеты — слой кита поверх.

> Импорт: `import { Skeleton } from '@capsuletech/web-ui/skeleton';`

## Когда использовать {#usage}

- **Загрузка крупной области с известной формой**: таблица, список, карточка, карта — пользователь видит будущую структуру, layout не прыгает.
- Для короткого неопределённого ожидания без формы — `Spinner`.
- В `Matrix`-ячейках skeleton задаётся через prop `skeleton` ячейки (per-slot Suspense fallback).

## Props {#props}

| Prop | Type | Default | Назначение |
|---|---|---|---|
| `variant` | `'text' \| 'table' \| 'list' \| 'card' \| 'map'` | `'text'` | Пресет формы |
| `rows` | `number` | text=3, table=8, list=5 | Кол-во строк для text/table/list |
| `class` / `style` | `string` / `JSX.CSSProperties` | — | Прокидываются на корневой элемент |

```tsx
<Skeleton />                          {/* 3 текстовые строки */}
<Skeleton variant="table" rows={10} />
<Skeleton variant="card" />
```

## Варианты {#variants}

- `text` — строки текста разной ширины.
- `table` — шапка + строки таблицы.
- `list` — строки списка с ведущим кружком.
- `card` — карточка: заголовок + тело.
- `map` — сплошная область под карту/канвас.

## Доступность {#a11y}

Kobalte `Skeleton.Root` даёт `role="group"` + data-атрибуты состояния (`data-animate` / `data-visible`). Skeleton — чисто визуальный сигнал; статус загрузки для screen-reader объявляй на уровне области данных (`aria-busy` / `role="status"` рядом).

## Контракт для studio {#contract}

<!-- audience: agent -->
`skeleton.contract.ts` — leaf; контракт-props: `variant` / `rows`. `class` — inspector-only, расширяется в `propsSchema` манифеста. Kobalte-first прецедент (2026-06-01): импорт `import { Root as SkeletonRoot } from '@kobalte/core/skeleton'` — именованный, не namespace.
<!-- /audience -->

## Связанное {#related}

- [[web-ui/primitives/spinner|Spinner]] — индикатор без формы.
- [[web-ui/primitives/card|Card]] — форма, которую имитирует `variant="card"`.
