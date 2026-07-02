---
title: Label
status: documented
type: primitive
audience: dev
tags: [web-ui, primitive, label, form]
last_updated: 2026-07-02
slug: web-ui/primitives/label
---

# Label {#label}

Подпись form-контрола `@capsuletech/web-ui` — тонкая обёртка над нативным `<label>` со стилями кита (`text-sm font-medium text-primary`) и disabled-каскадом от peer-контрола.

> Импорт: `import { Label } from '@capsuletech/web-ui/label';`

## Когда использовать {#usage}

- **Подпись любого контрола**: input, select, toggle, checkbox.
- Внутри композиции формы предпочитай `Field.Label` — он добавляет field-каскады (disabled-группа, card-style choice) поверх этого примитива.
- **Не использовать** для произвольного текста — для этого есть `Typography`.

## Props {#props}

| Prop | Type | Default | Назначение |
|---|---|---|---|
| `for` | `string` | — | id связанного контрола; клик по подписи фокусирует его |
| `class` / `style` | `string` / `JSX.CSSProperties` | — | Прокидываются на `<label>` |

Все прочие HTML-атрибуты `<label>` проходят через spread.

```tsx
<Label for="email">E-mail</Label>
<Input id="email" type="email" />
```

## Доступность {#a11y}

- Ассоциация — нативная `for`/`id`: screen-reader читает подпись при фокусе контрола, клик передаёт фокус.
- `peer-disabled:` — при disabled peer-контроле label получает `cursor-not-allowed opacity-70` (контрол должен быть peer'ом в DOM).

## Контракт для studio {#contract}

<!-- audience: agent -->
`label.contract.ts` — leaf; контракт-props: `for`. `children` / `class` — inspector-only, расширяются в `propsSchema` манифеста.
<!-- /audience -->

## Связанное {#related}

- [[web-ui/primitives/field|Field]] — form-композиция с `Field.Label` поверх этого примитива.
- [[web-ui/primitives/input|Input]] — типовой связанный контрол.
