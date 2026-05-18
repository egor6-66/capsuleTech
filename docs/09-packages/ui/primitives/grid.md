---
tags: [ui, primitive, grid]
status: documented
---

# Grid

CSS Grid с поддержкой именованных областей (grid-areas) и гибких размеров колонок. Для layout-ориентированных задач (дашборды, многоколонные страницы, таблицы).

## Когда использовать

- Многоколонные сетки (галереи, списки товаров, таблицы).
- Именованные области (dashboard с header + sidebar + main).
- Когда нужна точная колонка/строка (в отличие от Flex, который больше о направлении).

## API

| Prop | Тип | Default | Описание |
|---|---|---|---|
| `cols` | `number \| string \| string[]` | — | Шаблон колонок: число → N равных, строка → CSS (e.g., `"200px 1fr 200px"`), массив → responsive |
| `rows` | `string \| string[]` | — | Шаблон строк (аналогично cols) |
| `gap` | `number \| string` | — | Зазор между ячейками (применяется и по горизонтали, и по вертикали) |
| `gapX` | `number \| string` | — | Горизонтальный зазор (column-gap) |
| `gapY` | `number \| string` | — | Вертикальный зазор (row-gap) |
| `areas` | `string[]` | — | Именованные области (`["header header", "sidebar main"]`) |
| `autoFlow` | `'row' \| 'column'` | — | Как заполняются неимплицитные ячейки |
| `autoRows` | `string` | — | Высота автоматических строк |
| `autoCols` | `string` | — | Ширина автоматических колонок |
| `inline` | `boolean` | — | `display: inline-grid` вместо `display: grid` |
| `as` | `ValidComponent` | `'div'` | Полиморфный тег |
| `class` | `string` | — | Добавочные классы |
| `children` | `JSX.Element` | — | Grid-элементы и `<Grid.Item>` |

### Grid.Item

| Prop | Тип | Default | Описание |
|---|---|---|---|
| `span` | `number` | — | Количество колонок (grid-column: span N) |
| `colStart` | `number \| string` | — | Номер стартовой колонки |
| `colEnd` | `number \| string` | — | Номер финишной колонки |
| `rowSpan` | `number` | — | Количество строк |
| `rowStart` | `number \| string` | — | Номер стартовой строки |
| `rowEnd` | `number \| string` | — | Номер финишной строки |
| `area` | `string` | — | Имя области (из `Grid.areas`) |
| `as` | `ValidComponent` | `'div'` | Полиморфный тег |

## Примеры

**3 равные колонки:**
```tsx
<Grid cols={3} gap={4}>
  <div>Item 1</div>
  <div>Item 2</div>
  <div>Item 3</div>
  <div>Item 4</div>
</Grid>
```

**Фиксированные боковины, резиновая середина:**
```tsx
<Grid cols="200px 1fr 200px" gap={2}>
  <div>Left</div>
  <div>Center</div>
  <div>Right</div>
</Grid>
```

**Именованные области (holy grail):**
```tsx
<Grid
  cols={2}
  rows={3}
  areas={[
    "header header",
    "sidebar main",
    "footer footer"
  ]}
  gap={2}
>
  <Grid.Item area="header">Header</Grid.Item>
  <Grid.Item area="sidebar">Sidebar</Grid.Item>
  <Grid.Item area="main">Main</Grid.Item>
  <Grid.Item area="footer">Footer</Grid.Item>
</Grid>
```

**Item с grid-column span (12-колонная сетка):**
```tsx
<Grid cols={12} gap={3}>
  <Grid.Item span={4}>Third</Grid.Item>
  <Grid.Item span={4}>Third</Grid.Item>
  <Grid.Item span={4}>Third</Grid.Item>
  <Grid.Item span={6}>Half</Grid.Item>
  <Grid.Item span={6}>Half</Grid.Item>
</Grid>
```

## Почему inline style, а не Tailwind-классы

Grid-параметры часто динамичны (количество колонок из API, размеры на основе viewport). Tailwind не умеет purge `gap-${n}` в рантайме.

**Решение:** Grid внутри вычисляет нужный inline `style`:
```tsx
<Grid
  cols={props.columnCount}  // из API
  gap={props.gapSize}        // из конфига
  {...}
/>
```

Компонент преобразует пропсы в CSS Grid properties и ставит их в `style`.

## Storybook

Откройся в `http://localhost:6006/?path=/story/components-grid--default` после `pnpm storybook` в `packages/web/ui/`.

## Pitfalls

- **Неявная сетка:** Grid автоматически создаёт ячейки для детей вне явного шаблона. Если ты указал `cols={3}`, но положил 10 детей, будут созданы дополнительные строки. Используй `autoRows` чтобы контролировать их высоту.
- **Смешивание методов:** не комбинируй `areas` и прямые `span`/`rowStart` одновременно — ведёт к коллизиям. Выбери стратегию: либо named areas, либо numeric positioning.
- **Содержимое выходит за пределы:** если содержимое ячейки больше, чем она, оно перетечёт. Добавь `overflow: auto` в стиль ячейки или убедись, что контент подходит.

## Связанное

- [[primitives/flex|Flex — альтернатива для направленных раскладок]]
- [[primitives/layout|Layout — готовый 5-зонный макет]]
- [[conventions|UI-kit канон]]
