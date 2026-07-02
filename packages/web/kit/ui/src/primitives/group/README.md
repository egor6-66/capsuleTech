---
title: Group
status: documented
type: primitive
audience: dev
tags: [web-ui, primitive, group, container]
last_updated: 2026-07-02
slug: web-ui/primitives/group
---

# Group {#group}

Универсальный контейнер для группировки элементов `@capsuletech/web-ui`. Обёртка над `Flex`: не дублирует CSS, маппит свои props в Flex. Два варианта визуальной сборки — `separate` (items с gap) и `attached` (items прижаты, внутренние радиусы и границы сливаются в единый блок).

> Импорт: `import { Group } from '@capsuletech/web-ui/group';`

## Когда использовать {#usage}

- **Группа связанных контролов**: segmented-кнопки, toolbar-кластер, пара «инпут + кнопка», группа тегов.
- **Не использовать** как общий layout-контейнер — для этого есть `Flex` (Group добавляет только семантику группы + variant-механику).
- **Не использовать** для списков данных — для этого есть `List` (семантический `<ul>`, hover/active-стили строк).

## Props {#props}

| Prop | Type | Default | Назначение |
|---|---|---|---|
| `orientation` | `'horizontal' \| 'vertical'` | `'horizontal'` | Ось группы: horizontal = row, vertical = col |
| `variant` | `'separate' \| 'attached'` | `'separate'` | separate — items с gap; attached — прижаты, радиусы/границы сливаются |
| `gap` | `number \| string` | `2` | Gap в режиме `separate`. Число × 0.25rem; строка — сырое CSS / токен |
| `data` | `T[]` | — | Batch mode: массив данных (требует `item.use`) |
| `item` | `{ use: Component; props?: (it) => Record }` | — | Batch mode: компонент-шаблон + маппер props (ADR 036 §3) |
| `tags` | `string[]` | — | Batch mode: фильтр items по пересечению `item.tags` |
| `resizable` | `boolean` | `false` | Batch mode: items становятся resizable (рендер через corvu) |
| `withHandle` | `boolean` | — | Визуальный grip на resize-handle (только при `resizable`) |
| `class` / `style` | `string` / `JSX.CSSProperties` | — | Прокидываются на корневой элемент |

## Режимы {#modes}

### Wrapper mode {#wrapper-mode}

Children передаются напрямую:

```tsx
<Group orientation="horizontal" variant="attached">
  <Button variant="outline">First</Button>
  <Button variant="outline">Second</Button>
  <Button variant="outline">Third</Button>
</Group>
```

### Batch mode {#batch-mode}

`data` + `item.use` (+ опциональный `item.props` / `tags`):

```tsx
<Group data={items} item={{ use: Button, props: (it) => ({ children: it.label }) }} />
```

Batch-props — runtime-only, в сериализуемый контракт палитры не входят (в studio Group строится из children-нод).

## Варианты {#variants}

- `separate` (default) — items разделены gap'ом; дефолтный шаг из манифеста — `var(--space-tight)` (плотные inline-группы).
- `attached` — единый блок: внешний контейнер несёт `rounded-md border`, у детей срезаются внутренние border-radius и убираются собственные borders. Между items вставляется `Group.Separator`.

## Group.Separator {#separator}

Визуальный разделитель между items (в attached-batch вставляется автоматически):

```tsx
<Group>
  <Button>A</Button>
  <Group.Separator />
  <Button>B</Button>
</Group>
```

Принимает `orientation` / `class` / `style`.

## Доступность {#a11y}

Group сам семантики не несёт (рендерится `<div>`/Flex). Для toolbar-групп добавляй `role="toolbar"` + `aria-label` через spread; для radio-подобных segmented-групп семантику несут сами контролы.

## Tokens / стили {#tokens}

<!-- audience: agent,dev -->
- `--space-tight` — дефолтный gap в манифесте (плотный шаг inline-группы).
- `--space-component` — дефолтный padding в манифесте (краевой отступ группы).
- attached-механика: `[&>*:first-child]/[&>*:last-child]` селекторы срезают радиусы на швах, `[&>*]:border-0` убирает границы детей — стили детей не переопределяются руками.
<!-- /audience -->

## Контракт для studio {#contract}

<!-- audience: agent -->
`group.contract.ts` описывает `orientation` / `variant` / `gap` в zod-схеме для studio inspector. Batch-props (`data` / `item` / `tags` / `resizable`) — runtime-only, в контракт не входят. `class` / `style` — inspector-only, расширяются в `propsSchema` манифеста.
<!-- /audience -->

## Связанное {#related}

- [[web-ui/primitives/layout/flex|Flex]] — низкоуровневая основа Group.
- [[web-ui/primitives/list|List]] — семантический список для данных (не группа контролов).
- [[web-ui/primitives/button|Button]] — типовой ребёнок attached-группы.
