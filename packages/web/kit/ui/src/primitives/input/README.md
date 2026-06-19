---
title: Input
status: documented
type: primitive
audience: dev
tags: [web-ui, primitive, input, form]
last_updated: 2026-06-19
slug: web-ui/primitives/input
---

# Input {#input}

Однострочный текстовый примитив `@capsuletech/web-ui`. Рендерится как нативный `<input>`, поддерживает все семантические типы (`text`, `email`, `password`, `tel`, `number`, `url`, `search`). Управляет 3-state background (empty → filled → active) через `data-filled` + `:focus-visible` — приложение не пишет классы руками.

> Импорт: `import { Input } from '@capsuletech/web-ui/input';`

## Когда использовать {#usage}

- **Однострочный ввод данных**: имя, email, пароль, поиск, числа, телефон, URL.
- **Не использовать** для многострочного текста — для этого есть `Textarea`.
- **Не использовать** для выбора из списка — для этого есть `Select`.
- Всегда использовать в паре с `Label` (явный `for` / `id`) для доступности.

## Props {#props}

| Prop | Type | Default | Назначение |
|---|---|---|---|
| `type` | `'text' \| 'password' \| 'email' \| 'tel' \| 'number' \| 'url' \| 'search'` | `'text'` | Семантический тип поля |
| `placeholder` | `string` | — | Подсказка при пустом поле |
| `value` | `string \| number` | — | Контролируемое значение |
| `defaultValue` | `string \| number` | — | Начальное значение (uncontrolled) |
| `disabled` | `boolean` | `false` | Блокирует поле |
| `required` | `boolean` | `false` | Native required (валидация формы) |
| `readonly` | `boolean` | `false` | Только для чтения |
| `name` | `string` | — | Имя поля для формы |
| `autocomplete` | `string` | — | Native autocomplete hint |
| `aria-invalid` | `'true' \| 'false' \| boolean` | — | Сигнализирует об ошибке валидации (ring-ring → red) |
| `size` | `'default'` | `'default'` | CVA размер (резервировано для будущих sm/lg) |
| `class` / `style` | `string` / `JSX.CSSProperties` | — | Прокидываются на корневой `<input>` |

Все прочие HTML-атрибуты `<input>` прокидываются напрямую (через spread). Полный typed-контракт — `input.contract.ts`.

## Типы {#types}

```tsx
<Input type="text" placeholder="Введите имя" />
<Input type="email" placeholder="you@example.com" />
<Input type="password" placeholder="Пароль" />
<Input type="search" placeholder="Поиск…" />
<Input type="number" placeholder="42" />
<Input type="tel" placeholder="+7 (000) 000-00-00" />
<Input type="url" placeholder="https://example.com" />
```

- `text` — общий случай: имя, комментарий, поиск без специальной семантики.
- `email` — мобильные браузеры показывают клавиатуру с `@`; встроенная HTML5-валидация.
- `password` — браузер скрывает символы; большинство password-менеджеров автодетектят.
- `search` — некоторые браузеры добавляют кнопку очистки.
- `number` — native step-controls; для денег следи за локалью.
- `tel` — мобильная числовая клавиатура; формат не валидируется браузером.
- `url` — мобильная клавиатура с `/` и `.com`; встроенная URL-валидация.

## Controlled / Uncontrolled {#controlled}

```tsx
// Controlled
const [value, setValue] = createSignal('');
<Input value={value()} onInput={(e) => setValue(e.currentTarget.value)} />

// Uncontrolled
<Input defaultValue="preset value" />
```

Компонент отслеживает заполненность через `data-filled` атрибут:
- controlled: из `props.value` реактивно.
- uncontrolled: через `onInput` + внутренний сигнал (seed из `defaultValue`).

## Состояния (3-state background) {#states}

| Состояние | CSS-сигнал | Стиль |
|---|---|---|
| Пустой | — | `bg-transparent` |
| Заполнен | `data-filled=""` | `bg-muted/40` |
| Активен | `:focus-visible` | `bg-background + ring-1 ring-ring` |

`:focus-visible` срабатывает и на mouse-click для текстовых полей (desired behaviour — ring помогает понять что поле активно).

## Валидация {#validation}

```tsx
<Input type="email" aria-invalid={hasError() ? 'true' : 'false'} />
```

`aria-invalid="true"` — скринридер озвучивает ошибку; `ring-ring` переключается на деструктивный цвет через токены темы (если настроено в web-style). Не используй только цвет для сигнализации ошибки — добавляй `aria-describedby` с текстом ошибки.

## Доступность {#a11y}

- Всегда парить с `<Label for={id}>` — native `label[for]` достаточно, JS не нужен.
- `disabled` — native attr (не `aria-disabled`); disabled поля не отправляются с формой.
- `required` — добавляй `aria-required="true"` дублирующий атрибут для скринридеров старых браузеров.
- `type="password"` — `autocomplete="current-password"` или `"new-password"` помогает менеджерам паролей.

## Tokens / стили {#tokens}

<!-- audience: agent,dev -->
- Размеры: `h-9` (фиксировано по shadcn canon) + `px-input` (horizontal padding от токена).
- Граница: `border-input` (токен) → `bg-muted/40` при filled → `ring-ring` при active.
- Переход: `transition-[background-color,border-color,box-shadow] duration-200`.
- File input reset: `file:border-0 file:bg-transparent file:text-sm file:font-medium`.
<!-- /audience -->

## Контракт для studio {#contract}

<!-- audience: agent -->
`input.contract.ts` описывает props в zod-схеме для studio inspector: enum для `type`, optional booleans, `examples` (palette preview), `styleSlots: ['root']`. Если меняешь публичный API — обновляй `interfaces.ts` + `input.contract.ts` синхронно.
<!-- /audience -->

## Связанное {#related}

- [[web-ui/primitives/textarea|Textarea]] — многострочный ввод того же семейства.
- [[web-ui/primitives/select|Select]] — выбор из списка того же визуального семейства.
- [[web-ui/primitives/label|Label]] — парный label для доступности.
- [[web-ui/primitives/field|Field]] — составной примитив Label + Input + Error-message.
