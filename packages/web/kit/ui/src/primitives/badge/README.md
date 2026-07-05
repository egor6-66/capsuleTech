---
title: Badge
status: documented
type: primitive
audience: dev
tags: [web-ui, primitive, badge, chip]
last_updated: 2026-07-05
slug: web-ui/primitives/badge
---

# Badge {#badge}

Stateless, пресет-driven бейдж/чип. Дедупит хендролл-бейджи
(`Card padding="sm" + Typography size="sm" tone="muted"`) и rule-chip/`WordChip`
в один примитив (канон product-wide kit layering). Классы — только внутри;
consumer передаёт props/пресеты, ноль сырых классов.

```tsx
import { Badge } from '@capsuletech/web-ui/badge';

<Badge>#core</Badge>                                    // статическая muted-пилюля
<Badge tone="outline">draft</Badge>
<Badge interactive selected onClick={pick}>#verb</Badge> // кликабельный чип
```

## Два подвида {#variants}

- **Статический** (`interactive` не задан) — inline-пилюля с лейблом (`<span>`).
  Замена `Card padding="sm" + Typography size="sm" tone="muted"`.
- **Интерактивный чип** (`interactive`) — `role="button"` + tabIndex + onClick +
  Enter/Space активация + `selected`-подсветка (accent) + `aria-pressed`.
  Замена rule-chip / `WordChip`.

## Props {#props}

| Prop | Тип | Описание |
|---|---|---|
| `children` | `JSX.Element` | Лейбл/тег. `#`-префикс — забота потребителя (контент). |
| `tone?` | `'default' \| 'muted' \| 'outline' \| 'accent'` | Визуальный тон. Default — `'muted'`. |
| `size?` | `'sm' \| 'md'` | Плотность. Default — `'sm'`. |
| `interactive?` | `boolean` | Кликабельный чип. Default — `false`. |
| `selected?` | `boolean` | Подсветка активного чипа (только при `interactive`). |
| `onClick?` | `(e: MouseEvent) => void` | Клик — только при `interactive`. |
| `class?` | `string` | Passthrough-класс. |

## Канон {#canon}

- **Stateless, props-only.** Никаких сигналов/эффектов внутри; выбор чипа —
  контролируется извне (`selected` + `onClick`).
- **Классы только внутри.** Публичный API — props/пресеты. `tone`/`size` = композиция
  **замороженных** токенов (ADR 042) через `badgeCva`, не новые классы.
- **`selected` overrides `tone`** — accent-акцент активного чипа поверх любого тона
  (compound-variant; twMerge оставляет последний конфликтующий `bg-*`/`text-*`).
- **A11y интерактивного чипа** — `role="button"`, `tabIndex=0`, `aria-pressed`,
  Enter/Space через прокси `.click()` (настоящий `MouseEvent` в `onClick`).
