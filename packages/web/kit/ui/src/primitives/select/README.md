---
title: Select
status: documented
type: primitive
audience: dev
tags: [web-ui, primitive, select, form]
last_updated: 2026-06-19
slug: web-ui/primitives/select
---

# Select {#select}

Выпадающий список `@capsuletech/web-ui`. Рендерится через Kobalte `Select`, поддерживает управляемый и неуправляемый режимы, визуально совпадает с `Input` / `Textarea` (тот же `INPUT_FIELD_BASE` — `h-9`, `border-input`, `px-input`). Состояния (empty / filled / open) управляются через Kobalte data-атрибуты — приложение не пишет классы руками.

> Импорт: `import { Select } from '@capsuletech/web-ui/select';`

## Когда использовать {#usage}

- **Выбор одного значения из конечного списка**: страна, категория, статус, тип.
- **Список 3–20 опций** — меньше трёх лучше покрыть `ToggleGroup`, больше двадцати — рассмотреть поиск / виртуализацию.
- **Не использовать** для многострочного текста — для этого `Textarea`.
- **Не использовать** для свободного ввода — для этого `Input`.
- Всегда использовать в паре с `Label` (явный `for` / `id`) для доступности.

## Props {#props}

| Prop | Type | Default | Назначение |
|---|---|---|---|
| `options` | `ISelectOption[]` | — | Список опций `{ value, label, disabled? }` |
| `value` | `string` | — | Управляемое значение |
| `defaultValue` | `string` | — | Начальное значение (uncontrolled) |
| `placeholder` | `JSX.Element` | — | Placeholder когда не выбрано |
| `disabled` | `boolean` | `false` | Блокирует весь элемент |
| `required` | `boolean` | `false` | Native required |
| `name` | `string` | — | Имя поля для формы |
| `aria-invalid` | `'true' \| 'false' \| boolean` | — | Сигнализирует об ошибке валидации |
| `onChange` | `(value: string) => void` | — | Срабатывает при выборе нового значения |
| `class` | `string` | — | Дополнительные классы на корневой элемент |

Полный typed-контракт — `select.contract.ts`. `options` в inspector'е показывается в режиме read-only (array-объекты пока не редактируются в `zod-to-categories`); пресеты задают нужные наборы.

## Варианты (пресеты) {#presets}

```tsx
// Simple — 3 опции, placeholder
<Select
  placeholder="Выберите…"
  options={[{ value: 'a', label: 'Option A' }, { value: 'b', label: 'Option B' }]}
/>

// Preselected — открывается с выбранным значением
<Select
  value="b"
  options={[{ value: 'a', label: 'Option A' }, { value: 'b', label: 'Option B' }]}
/>

// Long list — 8+ опций, прокрутка
<Select
  placeholder="Выберите страну…"
  options={[
    { value: 'ru', label: 'Россия' },
    { value: 'us', label: 'США' },
    // ...
  ]}
/>

// Disabled — недоступен
<Select disabled placeholder="Нельзя выбрать" options={[]} />
```

## Controlled / Uncontrolled {#controlled}

```tsx
// Controlled
const [value, setValue] = createSignal('');
<Select value={value()} onChange={setValue} options={opts} />

// Uncontrolled
<Select defaultValue="b" options={opts} />
```

## Compound mode {#compound}

Для кастомного layout trigger'а — используй составные части:

```tsx
<Select options={opts} value={v()} onChange={setV} placeholder="Choose…">
  <Select.Trigger>
    <Select.Value />
  </Select.Trigger>
  <Select.Content />
</Select>
```

`Select.Trigger`, `Select.Content`, `Select.Value` экспортируются отдельно для тех случаев, когда нужен нестандартный триггер или позиционирование.

## Состояния (3-state background) {#states}

| Состояние | CSS-сигнал | Стиль |
|---|---|---|
| Пустой | `data-[placeholder-shown]` | `bg-transparent` |
| Заполнен | нет `data-[placeholder-shown]` | `bg-muted/40` |
| Открыт | `data-[expanded]` | `bg-background + ring-1 ring-ring` |

Открытый state использует `data-[expanded]` вместо `:focus-visible` — после закрытия Kobalte возвращает фокус на trigger, и `:focus-visible` ложно бы подсвечивал закрытый trigger на mouse-click. Кольцо показывается только пока dropdown открыт.

## Доступность {#a11y}

- Всегда парить с `<Label for={id}>` — native `label[for]` достаточно, JS не нужен.
- `disabled` — native attr (не `aria-disabled`); отключённые поля не отправляются с формой.
- `required` — Kobalte прокидывает на hidden input внутри.
- `aria-invalid="true"` — скринридер озвучивает ошибку; добавляй `aria-describedby` с текстом ошибки.
- Клавиатурная навигация: `Space`/`Enter` открывает, стрелки выбирают, `Escape` закрывает — обеспечивает Kobalte.

## Tokens / стили {#tokens}

<!-- audience: agent,dev -->
- Размеры: `h-9` (shadcn canon, совпадает с Input) + `px-input` (horizontal padding от токена).
- Граница: `border-input` → `ring-1 ring-ring` при expanded.
- Панель: `w-[var(--kb-popper-anchor-width)]` — ширина по trigger'у; `max-h-[var(--kb-popper-content-available-height)]` — ограничена viewport'ом.
- Анимация панели: `popover-animate` класс из `@capsuletech/web-style/index.css` (keyframes `popover-in` / `popover-out`).
<!-- /audience -->

## Контракт для studio {#contract}

<!-- audience: agent -->
`select.contract.ts` описывает props в zod-схеме для studio inspector: массив `options`, optional booleans, `examples` (palette preview), `styleSlots: ['root', 'content']`. Если меняешь публичный API — обновляй `interfaces.ts` + `select.contract.ts` синхронно.
`options` — массив объектов — сейчас не редактируется в `zod-to-categories` (graceful degradation: inspector тихо пропускает поле). Пресеты задают нужные наборы для быстрого старта.
<!-- /audience -->

## Связанное {#related}

- [[web-ui/primitives/input|Input]] — однострочный ввод того же визуального семейства.
- [[web-ui/primitives/textarea|Textarea]] — многострочный ввод того же семейства.
- [[web-ui/primitives/label|Label]] — парный label для доступности.
- [[web-ui/primitives/field|Field]] — составной примитив Label + контрол + Error-message.
