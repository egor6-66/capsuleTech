---
title: Launcher
status: documented
type: composite
audience: dev
tags: [web-ui, composite, launcher, welcome]
last_updated: 2026-07-05
slug: web-ui/composites/launcher
---

# Launcher {#launcher}

Stateless hero + грид кликабельных карточек-разделов. Визуал вынесен из
learn-копии `welcome/Welcome.tsx` (дедуп Nav/Welcome, канон product-wide kit
layering).

```tsx
import { Launcher } from '@capsuletech/web-ui/launcher';

<Launcher items={sections} title="Обучение" onSelect={goToSection} />;
```

## Props {#props}

| Prop | Тип | Описание |
|---|---|---|
| `items` | `readonly ILauncherItem[]` | Разделы (`{ id, label, description? }`). |
| `onSelect` | `(id: string) => void` | Клик / Enter / Space по карточке. |
| `title?` / `description?` | `string` | Hero. Оба пусты — блок hero не рисуется. |
| `hint?` | `string` | Подсказка внизу (muted). |
| `preset?` | `string` | Имя пресета вида. Default — `'default'`. |
| `class?` / `style?` | — | Passthrough на корневой контейнер. |

## Канон {#canon}

- **Stateless, props-only.** Роутер/emit не известны — клик уходит через
  `onSelect`. Connected-обвязку держит `@capsuletech/web-shell`.
- **Кликабельная карточка** = канон-проп `Card interactive` (cursor + hover-surface).
  A11y кнопки (`role="button"` + `tabIndex={0}` + Enter/Space → `onClick`) вшита в
  сам `Card` — Launcher даёт только `interactive` + `onClick`, руками a11y не пишет.
  Ноль сырых hover-классов в публичном API; focus-ring — внутренний класс kit'а.

## Пресеты {#presets}

`preset?` резолвится в `ILauncherPresetConfig` (padding / зазоры / max-width /
размеры Typography) через `resolveLauncherPreset`. Пресет = композиция замороженных
токенов (ADR 042), не новые классы. Для пилота — один дефолт-пресет + точка
расширения.
