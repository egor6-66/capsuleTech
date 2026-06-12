---
tags: [hca, adr, accepted]
status: accepted
date: 2026-06-03
---

> [!info] Status
> **Accepted** — 2026-06-03. Реализация: web-renderer (owner-web-renderer) → затем apps/ui-creator.

# ADR 031 — Renderer edit-overlay: per-node design-поверхность без замеров

## Контекст {#context}

`apps/ui-creator/src/widgets/canvas.tsx` рисует editor-chrome (выделение, drop-цель, кандидаты, линия-вставки, цветные метки) **отдельным абсолютным слоем**, позиции боксов в котором вычисляются через `getBoundingClientRect` + пересчёт по `tick`-сигналу и `ResizeObserver`. Это порождает класс багов:

- родительский контейнер «не знает, что в нём контент» — бокс померили до того, как DOM устаканился;
- дочерние компоненты «выезжают» из контейнера — рассинхрон замера и реальной раскладки;
- лишние focus-ring'и на инпуте/кнопке — оверлей `pointer-events-none`, клик проходит сквозь него в настоящий компонент.

Корень: замер-и-репозиционирование принципиально гонится с раскладкой, а `ResizeObserver` на ноду — костыль поверх этого. Плюс вся переиспользуемая «design-mode» машинерия (оверлеи, hit-test, детект раскладки через `getComputedStyle`) размазана по аппу императивным DOM-кодом — антипаттерн HCA («UI is a shadow»), и причина, по которой апп «спотыкается».

## Решение {#decisions}

Edit-поверхность — это **возможность рендерера**, а не ручной слой в аппе. Делим **механизм** и **политику**:

- **Механизм (пакет `@capsuletech/web-renderer`)** — per-node overlay-слот, который трекает размер ноды **средствами CSS** (ноль замеров), layout-safe, тогглится edit↔interactive.
- **Политика (апп `apps/ui-creator`)** — как выглядит обводка (цветная метка доминирует над `primary`), что выделено, где drop-цель — всё через editor-store. Весь императивный DOM-код из `canvas.tsx` уезжает.

### Контракт рендерера

Новый **опциональный** prop, **ортогональный** `mode` (`mode` — это шкала interaction-возможностей `static|controlled|full`; edit туда не входит):

```ts
export interface IEditOverlayProps {
  nodeId: NodeId;
  node: IEditorNode;
}

export interface IRendererProps {
  // ...существующее...
  /**
   * Если задан — рендерер в «edit-decoration» режиме: для каждой ноды подвешивает
   * overlay-слот, в который хост рисует editor-chrome (обводка/заливка/ловля
   * событий). Отсутствует → обычный рендер (interactive: компоненты живые).
   */
  editOverlay?: Component<IEditOverlayProps>;
}
```

### Механизм (зона owner-web-renderer — детали JSX за ним)

Для каждой ноды, когда `editOverlay` задан, рендерер обязан обеспечить **инвариант**:

1. **Ноль замеров.** Никаких `getBoundingClientRect` / `ResizeObserver` / `tick`. Размер оверлея берётся из раскладки.
2. **Оверлей ровно по боксу ноды.** Overlay = `position: absolute; inset: 0` **внутри** бокса ноды (корень ноды форсится `position: relative`). Контейнер вырос от контента → оверлей вырос сам.
3. **Layout-identical.** Рендер с `editOverlay` совпадает по раскладке с рендером без него (никаких лишних flex/grid-детей, сдвигов).
4. **Тоггл.** `editOverlay` отсутствует → обычный рендер; компоненты получают события (interactive-режим редактора).

Рекомендуемая реализация:
- Корень ноды форсится `position: relative` через инжект в props (компоненты уже форвардят произвольные props/attrs в корень — это доказано `data-node-id`).
- Overlay-элемент аппендится **после** реальных детей/текста ноды (children-getter в edit-режиме отдаёт `<>{realChildren}{<EditCellMount/>}</>`), внутри него — `<editOverlay nodeId node />`.
- **Void-элементы** (`input`, `hr`, `img`, ... — ребёнка не примут): рендерер оборачивает **только их** в `relative`-обёртку, сохраняющую display/раскладку. Это точечное исключение, не глобальный слой.

owner-web-renderer вправе выбрать иную механику, **пока держится инвариант 1–4**.

### Политика (зона apps/ui-creator)

- `editOverlay` хоста = маленький компонент: читает editor-store (`selectedId`, `marks`, `dropTargetId`, drag-spec), рисует `box-shadow: inset 0 0 0 Npx <color>` + заливку, ловит клик→select / drag-handle. `pointer-events: auto` на оверлее → до настоящего инпута/кнопки событие не доходит (нет чужих focus-ring'ов, не нужен `preventDefault`).
- Цвет = `marks()[id] ?? var(--primary)` — метка доминирует над всеми видами подсветки.
- Тоггл «interactive»: апп держит сигнал; `true` → не передаёт `editOverlay` (+ можно поднять `mode` до `controlled` для живого поведения).
- `canvas.tsx` теряет `measure`/`nodeRect`/`tick`/`ResizeObserver`/`getComputedStyle`/`insetRect`/`chromeBoxes`.

## Последствия {#consequences}

- **+** Все 4 класса багов закрываются по построению (размер из CSS, события на оверлее).
- **+** Механизм переиспользуем (любой будущий визуальный редактор на рендерере).
- **+** Апп возвращается к HCA-композиции, без императивного DOM.
- **−** Рендерер получает «design»-ответственность (раньше — чистый рендер). Изолирована одним опциональным prop'ом; в проде (`editOverlay` отсутствует) путь не меняется.
- **−** Void-элементы требуют точечной обёртки в рендерере (контролируемое исключение).

## План

1. **web-renderer** (owner-web-renderer): `editOverlay` prop + механизм + void-обёртка + тесты (overlay монтируется per-node, отсутствует без prop'а, layout-identical). Без git — рабочее дерево.
2. **apps/ui-creator**: переписать `canvas.tsx` на `editOverlay`-хост, выкинуть замеры; `tree.tsx` — те же цветные-метки/выделение в цвете метки; добавить interactive-тоггл.
3. Юзер ревьюит и коммитит сам (collab-workflow ui-creator).
```
