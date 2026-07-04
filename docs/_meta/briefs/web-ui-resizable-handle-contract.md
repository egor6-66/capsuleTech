# Бриф: web-ui Resizable — per-handle контракт (hairline + реактивный enable)

**Кому:** owner-web-ui
**От:** owner-boost-layout (2026-07-04)
**Приоритет:** P0 — блокирует вторую половину bug-репорта по Matrix (resize-приоритеты + «бордер от resizable»)
**Зона правок:** `packages/web/kit/ui/src/primitives/layout/resizable/` (только)

---

## Контекст / симптом

Пользовательский bug-репорт по `Layouts.Matrix` (boost-layout): на слоте `resizable: true` появляется «бордер», `resizable: false` его убирает — хотя бордер не должен зависеть от resizable вообще. Плюс требуемая семантика приоритетов: per-slot `resizable` должен оверрайдить `mode` и глобальный сигнал (например, `mode="view"` + слот `resizable: true` → у этого слота ручка активна).

## Диагноз (root cause — в web-ui Resizable)

1. **«Бордер» — это hairline самого handle.** `ResizableHandle` красится `w-px bg-border` (vertical: `h-px`) — `resizableHandleCva`, `src/primitives/layout/resizable/_resize/variants.ts:18-25`. Handle рендерится между панелями всегда, когда оба соседних item'а `resizable !== false` (`resizable.tsx:56-67`), **независимо** от `withHandle`/`handleDisabled`. То есть в disabled-состоянии линия остаётся видимой → консьюмер воспринимает её как бордер слота.

2. **Enable — только контейнер-левел.** `withHandle` (grip-иконка) и `handleDisabled` (pointer lock) — пропсы всего `Resizable` (`interfaces.ts:28-30`). `IResizableItem.resizable` — структурный boolean (есть handle / нет handle). Смешанные состояния внутри одного контейнера («эта ручка активна, соседняя — нет», реактивно) невыразимы.

## Почему это не чинится в boost-layout

Единственный рычаг у консьюмера — `item.resizable = false`, но это **структурный** флип: все items `false` → Resizable уходит в `StaticInner` (плоский flex без corvu-панелей) → размеры панелей схлопываются; а live-переключение флага пересоздаёт дерево панелей — нарушает toggle-stability контракт Matrix (тоггл resize/dnd не должен ремоунтить контент ячеек — там живут accordion/scroll/focus state). Проверено, зафиксировано в `packages/web/boost/layout/OWNERSHIP.md` (Quirks, 2026-07-04).

## Что нужно сделать

### (а) Disabled handle не рисует линию

Когда handle неактивен (см. (б)): **без** `bg-border`, без resize-курсора, `pointer-events-none`, grip скрыт. Видимая линия — только у активной ручки. Разделитель-«бордер» ячеек — забота консьюмера (в Matrix это проп `bordered`), не handle'а. Токены существующие (`bg-border`) — набор заморожен (ADR 042).

### (б) Per-item реактивный enable ручки

Предложение по API (финальное решение за тобой, контракт обсуждаем):

```ts
export interface IResizableItem {
  // ... как сейчас; `resizable` остаётся СТРУКТУРНЫМ (панель участвует в corvu,
  // handle между structurally-resizable соседями существует в DOM)
  resizable?: boolean;
  /**
   * Реактивная активность ручки. Default: true.
   * Handle между i и i+1 активен ⇔ active(i) && active(i+1)
   *   && !props.handleDisabled.
   * false → handle остаётся смонтирован (без ремоунта панелей!), но:
   *   прозрачный (нет bg-border), pointer-events-none, без grip.
   */
  handleActive?: boolean | Accessor<boolean>;
}
```

Ключевые требования:
- **Реактивность без ремоунта:** флип `handleActive` меняет только классы/поведение handle-элемента (classList / corvu `Handle.disabled`), панели и их children не пересоздаются.
- Контейнерные `withHandle` / `handleDisabled` продолжают работать как глобальные гейты (AND с per-item): существующие консьюмеры не ломаются, дефолт `handleActive: true` — поведение back-compat, КРОМЕ пункта (а): disabled-ручка перестаёт рисовать линию. Это намеренное изменение (канон: бордер ≠ resize-аффорданс).
- Grip (`withHandle`) показывается только на активной ручке.

### Проверка

- Unit (jsdom): активная ручка — есть `bg-border`-класс и corvu handle enabled; неактивная — прозрачна, `pointer-events-none`, grip отсутствует; live-флип accessor'а не ремоунтит панели (реф-идентичность DOM-узлов панелей сохраняется).
- Stories: вариант со смешанными ручками (одна активна, одна нет).
- `pnpm --filter @capsuletech/web-ui build` + существующие resizable-тесты зелёные.

## Follow-up после мержа (моя зона, boost-layout — НЕ делать в этом PR)

Плумбинг в Matrix: эффективный флаг слота `slot.resizable ?? resolved(mode, global)` → `handleActive`-акцессоры per-pair; убрать hardcoded `resizable: true` у `middle-row` в app-shell пресете. DnD-половина приоритетов (per-slot `draggable` tri-state, group-aware бэйджи, реактивный swapped-content) уже закрыта коммитом `4fed787e` (fix(boost-layout), 2026-07-04).

## Ссылки

- `packages/web/kit/ui/src/primitives/layout/resizable/resizable.tsx:56-67` — рендер handle между resizable-соседями.
- `packages/web/kit/ui/src/primitives/layout/resizable/_resize/variants.ts:18-25` — `resizableHandleCva` с безусловным `bg-border`.
- `packages/web/kit/ui/src/primitives/layout/resizable/_resize/primitives.tsx:34-49` — `ResizableHandle` (grip за `withHandle`, `disabled` в corvu).
- `packages/web/boost/layout/OWNERSHIP.md` — Quirks/Roadmap 2026-07-04 (диагноз + эскалация).
- Потребитель-мотиватор: `apps/learn/src/pages/_workspace/index.tsx` (`mode="view"` + header `resizable: true`).
