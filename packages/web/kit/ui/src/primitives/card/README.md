---
title: Card
status: documented
type: primitive
audience: dev
tags: [web-ui, primitive, card, composition]
last_updated: 2026-07-02
slug: web-ui/primitives/card
---

# Card {#card}

Контейнер-карточка `@capsuletech/web-ui` — compound-композиция: `Card` + `Card.Header` / `Card.Title` / `Card.Description` / `Card.Content` / `Card.Footer`. Несёт хром поверхности (фон `bg-card`, `rounded-lg`, border, shadow); внутренняя структура собирается из частей.

> Импорт: `import { Card } from '@capsuletech/web-ui/card';`

## Когда использовать {#usage}

- **Обособленный блок контента**: виджет дашборда, форма авторизации, stat-плитка, превью сущности.
- **Не использовать** как невидимый layout-контейнер — для этого есть `Flex` / `Grid` (Card всегда несёт хром: shadow / border / padding).
- Для рендера одного объекта данных полями «label + value» внутрь Card кладётся `PreviewCard` (atomic, сам в Card не оборачивается).

## Props {#props}

| Prop | Type | Default | Назначение |
|---|---|---|---|
| `elevation` | `'none' \| 'sm' \| 'md' \| 'lg' \| 'xl'` | `'sm'` | Тень (`shadow-{level}`); twMerge корректно перекрывает базовую |
| `w` / `minW` / `maxW` | `number` | — | Ширина по spacing-шкале: `w={24}` → `calc(var(--spacing) * 24)` (паритет с Flex sizing) |
| `interactive` | `boolean` | `false` | Визуальный аффорданс кликабельности: `cursor-pointer` + `hover:bg-accent hover:text-accent-foreground`. Не биндит onClick — это по-прежнему ответственность consumer'а (meta) |
| `selected` | `boolean` | `false` | Персистентная "выбранная" поверхность (`bg-accent text-accent-foreground`) + `data-selected` на корне. Для тайл/чип-сеток с единственным выбранным элементом |
| `padding` | `'none' \| 'sm' \| 'md'` | `'none'` | Padding корня: `none` — как раньше (хром без отступов), `sm` — `p-card-tight` (компактные тайлы/чипы), `md` — `p-card` (как у `Card.Content`) |
| `class` / `style` | `string` / `JSX.CSSProperties` | — | Прокидываются на корневой `<div>` |

Дефолт из манифеста: `class="w-full max-w-sm"`.

## Композиция {#composition}

```tsx
<Card>
  <Card.Header divider>
    <Card.Title>Заголовок</Card.Title>
    <Card.Description>Подзаголовок карточки</Card.Description>
  </Card.Header>
  <Card.Content>…</Card.Content>
  <Card.Footer>
    <Button>Action</Button>
  </Card.Footer>
</Card>
```

### Части {#parts}

| Часть | Назначение | Props |
|---|---|---|
| `Card.Header` | Шапка (`px-card py-card-tight`) | `divider?: boolean` — `border-b` под шапкой |
| `Card.Title` | Заголовок (`font-semibold text-lg`) | `align?: 'start' \| 'center' \| 'end'` |
| `Card.Description` | Приглушённый подзаголовок (`text-sm text-muted-foreground`) | `align?` |
| `Card.Content` | Тело: вертикальный стек `gap-cell p-card` | `gap?: number` / `padding?: number` — override по spacing-шкале (0 — убрать) |
| `Card.Footer` | Подвал (`flex items-center px-card pb-card`) | — |

Все части опциональны и комбинируются свободно; Content-only карточка валидна.

### Tile / chip pattern (без частей) {#tile}

Для компактных selectable-тайлов (грид слов, тег-чипы) `Card` используется напрямую —
без `Card.Header`/`Card.Content` — с `padding='sm'` + `interactive` + `selected`:

```tsx
<Card padding="sm" interactive selected={isSelected}>
  {label}
</Card>
```

Не заводи отдельный Badge/Chip-примитив под этот случай — `Card` уже несёт нужный
хром (border/radius/поверхность); чип — просто Card с компактным padding.

## Доступность {#a11y}

Card — `<div>` без собственной роли. Для самостоятельных смысловых блоков используй `aria-labelledby` на связке Card ↔ Card.Title, интерактивные карточки — через вложенный `<a>`/`<button>` на всю область, не onClick на корне. `selected` даёт `data-selected` (не `aria-selected` — на bare `<div>` без role это невалидный ARIA, лints it); если Card используется как listbox-option/tab, добавь `role` + `aria-selected` сам через passthrough-пропсы.

## Tokens / стили {#tokens}

<!-- audience: agent,dev -->
- Поверхность — токены `bg-card` / `text-card-foreground`; радиус — `rounded-lg` (канон, был `rounded-xl`).
- Padding частей — density-aware токены `px-card` / `py-card-tight` / `p-card` / `pb-card`.
- Gap контента — `gap-cell`; переопределяется props `gap`/`padding` через inline-style (spacing-шкала).
- `elevation` — статическая таблица `shadow-*` классов (Tailwind purge видит все уровни).
<!-- /audience -->

## Контракт для studio {#contract}

<!-- audience: agent -->
`card.contract.ts` — kind `composition`: `rule.accepts([...])` разрешает прямыми детьми только `Card.*` части; `elevation` — единственный контракт-prop корня. `styleSlots`: root/header/title/description/content/footer. Части имеют собственные манифесты (`ui.Card.Header` и т.д.); `Card.Content` / `Card.Footer` принимают любых НЕ-Card-детей.
<!-- /audience -->

## Связанное {#related}

- [[web-ui/primitives/field|Field]] — form-композиция, частый житель Card.Content.
- [[web-ui/primitives/layout/grid|Grid]] — сетка карточек на дашборде.
- [[web-ui/primitives/typography|Typography]] — текст внутри Content.
