---
tags: [hca, adr, accepted]
status: canon
date: 2026-06-02
---

> [!info] Status
> **Accepted** — 2026-06-02. Реализация по фазам (см. ## План).

# ADR 029 — Widget frame: кастомный chrome ноды/виджета

## Контекст {#context}

Виджеты на нод-канвасе (`@capsuletech/web-flow`, ADR 027) сейчас носят **дефолтный chrome xyflow**: синяя outline-рамка на `selected`, стандартные resize-хэндлы. Хочется:

1. **Брендовый chrome** — своя рамка (вместо синей), кастомные SVG-иконки в углах/краях.
2. **ДнД только за «главный угол»** — потому что внутри виджета бывают ползунки/кнопки; интерактив виджета **не должен** триггерить drag/pan канваса.
3. **Reveal по выделению** — верхний-правый угол всегда виден; по выделению ноды показываются resize-хэндлы; клик вне ноды — прячет (как сейчас синяя рамка).
4. **Переиспользуемость** — тот же «фрейм виджета» позже нужен в `Layout.Matrix` (ADR 026), не только на канвасе.

Ограничение слоёв: **`@capsuletech/web-core` — это движок HCA** (wrapper'ы, UiProxy, контекст). Он **не должен знать про canvas/xyflow** — иначе инверсия слоёв (web-flow зависит от web-core, не наоборот). Значит chrome нельзя класть в `web-core/src/wrappers`, и нельзя «вшивать» его в `Widget`-wrapper (chrome context-specific: канвас = xyflow-drag/resize, Matrix = corvu-resize, Page = никакого).

## Решение {#decisions}

Разделяем **визуал** и **поведение** на три зоны:

### 1. Визуал — `Ui.WidgetFrame` (web-ui)

Презентационный примитив в `@capsuletech/web-ui` (`primitives/widget-frame/`). Чистая отрисовка, **никакого** xyflow/drag/resize внутри — только рамка, позиционированные слоты и `active`-стейт.

```tsx
export interface IWidgetFrameProps {
  /** Выделено: показывает resize-слот + active-подсветку рамки. */
  active?: boolean;
  /** Контент виджета. */
  children?: JSX.Element;
  /** Угол-ручка ДнД (default: grip-глиф). Класс задаёт host (для xyflow dragHandle). */
  grip?: JSX.Element;
  /** Класс на grip-элементе — host таргетит его как dragHandle. Default 'cap-widget-grip'. */
  gripClass?: string;
  /** Какой угол — grip. Default 'top-left'. */
  gripCorner?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  /** Верхний-правый контрол, ВСЕГДА видим (default: control-глиф). */
  controls?: JSX.Element;
  /** Resize-хэндлы; рендерятся ТОЛЬКО при active. Host кладёт сюда xyflow NodeResizeControl. */
  handles?: JSX.Element;
  class?: string;
}
```

- Рамка: resting (тонкая `--border`) + active (акцент `--ring`/`--primary`) — через `createStyle`/CVA, токены темы.
- Слоты позиционируются `absolute` (grip — в `gripCorner`, controls — top-right, handles — по углам/краям).
- Дефолтные глифы (lucide) — чтобы работало **до** прихода кастомных SVG; пользовательские SVG втыкаются через слоты `grip`/`controls`/`handles`.
- Регистрируется в `Ui` через web-core ui-kit как `Ui.WidgetFrame` (lazy, по образцу `Ui.MapView`/`Ui.Chart`).

### 2. Поведение канваса — web-flow

В `@capsuletech/web-flow`:
- **flow.css** — погасить дефолтный selection-chrome (`.solid-flow__node.selected` outline/border → none).
- **Нод-фрейм** — обёртка ноды поверх `Ui.WidgetFrame`: `active` ← xyflow `selected`; `gripClass` ← селектор, который проставляется в `node.dragHandle`; в слот `handles` кладётся `NodeResizeControl` (кастомные SVG-хэндлы), видимый по `selected`.
- **Re-export** `NodeResizeControl` (для кастомных resize-хэндлов; сейчас реэкспортится только `NodeResizer`).
- Интерактив виджета помечается `nodrag` / `nopan` / `nowheel` — drag/pan/zoom канваса не триггерится из тела виджета.

### 3. Регистрация — web-core

`packages/web/core/src/ui-kit/imports.tsx` + `wrappers/interfaces.ts` — добавить `WidgetFrame` в `Ui` (lazy), по образцу `Chart`/`MapView`. web-core зависит от web-ui (уже так для всех примитивов) — слой не нарушается.

### Модель взаимодействия

- **Главный угол** (`gripCorner`, default top-left, стилизованный) → `dragHandle` → перемещение ноды.
- **Верхний-правый** → всегда видимый контрол; клик выделяет ноду → `active` → reveal resize-хэндлов + подсветка.
- **Клик вне ноды** (pane) → xyflow deselect → `active=false` → хэндлы прячутся (замена синей рамки).
- Тело виджета — полный интерактив, без конфликта с навигацией флоу.

## Альтернативы {#alternatives}

| Вариант | Почему нет |
|---|---|
| Chrome в `web-core/src/wrappers` | Инверсия слоёв: web-core начнёт зависеть от web-flow/xyflow. Движок HCA должен оставаться canvas-agnostic. |
| Вшить chrome в `Widget`-wrapper | Chrome context-specific (канвас/Matrix/Page разные). Wrapper навешивал бы лишнее на виджеты вне канваса. |
| Только в web-flow (без web-ui примитива) | Не переиспользовать визуал в `Layout.Matrix`. Разделение visual/behavior даёт обе зоны. |

## Последствия {#consequences}

- Чистые слои: визуал (web-ui) ⟂ поведение (web-flow) ⟂ движок (web-core).
- `Ui.WidgetFrame` переиспользуется: канвас сейчас, `Layout.Matrix` позже (своя обвязка corvu-resize вокруг того же визуала).
- web-flow реэкспортит `NodeResizeControl`.
- `apps/nexus/canvas.tsx` мигрирует на нод-фрейм; дефолтный синий chrome выключается.
- Кастомные SVG-иконки — pluggable через слоты, не хардкод.

## План (фаза = PR)

1. **web-ui** — `WidgetFrame` примитив (визуал, слоты, дефолт-глифы, active-стейт, stories). [owner-web-ui]
2. **web-core** — регистрация `Ui.WidgetFrame` (lazy) + тип. [owner-web-core]
3. **web-flow** — flow.css (off синяя), нод-фрейм поверх `Ui.WidgetFrame`, `NodeResizeControl` re-export, `dragHandle`/`nodrag`/`nopan`/`nowheel`. [web-flow зона]
4. **nexus** — `canvas.tsx` на нод-фрейм; вставить пользовательские SVG в слоты.
5. **Позже** — `Layout.Matrix` использует `Ui.WidgetFrame`.

## Связанное {#related}

- [[027-web-flow-node-canvas]] — нод-канвас.
- [[026]] — Layout.Matrix (будущий потребитель).
- [[028-web-charts-package]] — паттерн регистрации `Ui.*` (Chart/MapView).
