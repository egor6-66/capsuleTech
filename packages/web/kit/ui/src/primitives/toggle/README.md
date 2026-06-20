---
slug: 'web-ui/primitives/toggle'
last_updated: 2026-06-20
---

# Toggle

Переключатель on/off с подписью. Реализует семантику `role="switch"` согласно ARIA, поддерживает controlled и uncontrolled режимы, три размера, отключённое состояние.

## Импорт

```ts
import { Toggle } from '@capsuletech/web-ui/toggle';
import type { IToggleProps } from '@capsuletech/web-ui/toggle';
```

Или из основного barrel'а:

```ts
import { Toggle } from '@capsuletech/web-ui';
```

---

## Когда использовать

**Используй Toggle когда:**
- Нужен бинарный On/Off переключатель — подписка на уведомления, auto-save, тёмная тема, видимость секции.
- Изменение немедленно применяется без кнопки «Сохранить» (Toggle = мгновенное действие).
- В settings-экранах, списках опций, onboarding-флоу.

**Не используй Toggle когда:**
- Выбор из нескольких опций (≥ 3) → используй radio/select.
- Действие требует подтверждения → используй Checkbox + кнопку «Применить».
- Нужен визуальный флажок (✓ / □) → используй Checkbox.

---

## Props

| Prop | Тип | По умолчанию | Описание |
|---|---|---|---|
| `size` | `'sm' | 'md' | 'lg'` | `'md'` | Размер переключателя и подписи. |
| `label` | `string` | — | Текстовая подпись справа. Если не задана — рисуется только трек. |
| `checked` | `boolean` | — | Controlled-режим: текущее состояние. Если не задано — uncontrolled. |
| `defaultChecked` | `boolean` | `false` | Начальное состояние для uncontrolled-режима. |
| `onChange` | `(checked: boolean) => void` | — | Вызывается при изменении состояния. |
| `disabled` | `boolean` | — | Блокирует переключение, добавляет native `disabled`. |
| `name` | `string` | — | HTML `name` атрибут для form-submission. |
| `class` | `string` | — | Дополнительный CSS-класс на корневой `<button>`. |

---

## Режимы

### Uncontrolled (рекомендуется для изолированных переключателей)

Состояние хранится внутри компонента. Задай начальное значение через `defaultChecked`:

```tsx
<Toggle
  label="Автосохранение"
  defaultChecked={true}
  onChange={(checked) => console.log('auto-save:', checked)}
/>
```

### Controlled (когда состояние управляется извне)

Состояние управляется пропсом `checked`. Без обновления prop'а переключатель не меняет отображение:

```tsx
const [enabled, setEnabled] = createSignal(false);

<Toggle
  label="Dark mode"
  checked={enabled()}
  onChange={setEnabled}
/>
```

---

## Размеры

| Размер | Трек | Когда применять |
|---|---|---|
| `sm` | `h-4 w-7` | Плотные списки настроек, inline-флаги в таблицах |
| `md` | `h-5 w-9` | Стандарт — большинство settings-экранов |
| `lg` | `h-6 w-11` | Primary-настройка экрана, onboarding, touch-зоны |

```tsx
<Toggle size="sm" label="Компакт" />
<Toggle size="md" label="Стандарт" />
<Toggle size="lg" label="Крупный" />
```

---

## Доступность

- `role="switch"` на `<button>` — семантика переключателя (не checkbox).
- `aria-checked="true|false"` — текущее состояние для screen reader'ов.
- Native `disabled` — браузер сам обрабатывает tab-порядок и визуальный feedback.
- `data-checked=""` (attribute, не value) — для CSS-селекторов без JS: `button[data-checked]`.
- Подпись через `<label for={id}>` — браузер сам кидает click на связанный control. НЕ добавляй onClick на label.
- `createUniqueId()` — стабильный id внутри Solid-компонента, привязывает label к кнопке.

---

## Tokens / стили

Все цвета — из темовых токенов:

| Состояние | Трек | Border |
|---|---|---|
| Off | `bg-muted` | `border-border` |
| On (`data-checked`) | `bg-primary` | `border-primary` |
| Disabled | opacity 50% | — |

Thumb (бегунок): `bg-background` + shadow. Анимация: `transition-colors duration-200` на треке, `transition-transform duration-200` на thumb.

Focus ring: `focus-visible:ring-2 focus-visible:ring-ring` — keyboard-navigation.

---

## Slots / hooks

- `data-checked` — атрибут (без значения) на `<button>`, когда переключатель активен. Используй в тестах: `btn.hasAttribute('data-checked')`.
- `data-[checked]` в CSS — CVA использует Tailwind-атрибутный вариант `data-[checked]:bg-primary`.
- Canvas-overlay в студио использует `button[role="switch"]` как корень-хит для resize.

---

## Контракт для studio

`ToggleContract` описывает props для Inspector'а палитры студио. Расположен в `toggle.contract.ts`, импортируется через `toggle/index.ts`:

```ts
import { ToggleContract } from '@capsuletech/web-ui/toggle';
```

Contract объявляет:
- `rule.isLeaf()` — дочерних элементов нет, Drop запрещён.
- `rule.props(...)` — size / label / checked / defaultChecked / disabled / name / aria-invalid.
- `rule.styleSlots(['root'])` — один корневой слот для class-инъекции.
- `rule.examples([...])` — 6 примеров для Inspector'а.

Примечание: `onChange` в контракт не включён (runtime-only handler). `aria-invalid` объявлен для форвард-совместимости с форм-семейством (Input/Select), но `toggle.tsx` его пока не обрабатывает.

---

## Связанное

- [[label]] — для ручной связки без `label` prop.
- [[field]] — для обёртки Toggle в форм-семейство с ошибками и описанием.
- `toggle.contract.ts` — декларативный контракт (studio/inspector).
- `variants.ts` — CVA-определения (toggleTrackCva / toggleThumbCva / toggleLabelCva).
