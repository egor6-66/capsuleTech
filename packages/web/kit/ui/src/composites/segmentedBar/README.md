---
title: SegmentedBar
status: documented
type: composite
audience: dev
tags: [web-ui, composite, segmented-bar, navigation]
last_updated: 2026-07-05
slug: web-ui/composites/segmentedBar
---

# SegmentedBar {#segmented-bar}

Stateless сегмент-бар — склеенный переключатель разделов. Визуал вынесен из
learn-копии `library/Navigation.tsx` (дедуп Nav/Welcome, канон
product-wide kit layering).

```tsx
import { SegmentedBar } from '@capsuletech/web-ui/segmentedBar';

<SegmentedBar items={segments} activeId={active()} onSelect={setActive} />;
```

## Props {#props}

| Prop | Тип | Описание |
|---|---|---|
| `items` | `readonly ISegmentedBarItem[]` | Сегменты (`{ id, label }`) в порядке отображения. |
| `activeId?` | `string` | id активного сегмента (подсветка). Приходит извне. |
| `onSelect` | `(id: string) => void` | Клик по сегменту. |
| `preset?` | `string` | Имя пресета вида. Default — `'default'`. |
| `class?` / `style?` | — | Passthrough на контейнер. |

## Канон {#canon}

- **Stateless, props-only.** Роутер/emit не известны — `activeId` даёт consumer,
  клик уходит через `onSelect`. Connected-обвязку держит `@capsuletech/web-shell`.
- **Классы только внутри компонента.** Публичный API — props/пресеты, ноль сырых
  классов (`class?` — необязательный passthrough).
- **Активный сегмент** = `item.id === activeId`: `aria-current="page"` + primary-акцент
  (из базового CVA Button) + `pointer-events-none`.

## Пресеты {#presets}

`preset?` резолвится в `ISegmentedBarPresetConfig` (ось / вариант контейнера /
варианты активной и неактивной кнопки) через `resolveSegmentedBarPreset`. Пресет =
композиция замороженных токенов (ADR 042), не новые классы. Для пилота — один
дефолт-пресет + точка расширения.
