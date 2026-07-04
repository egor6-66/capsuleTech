# Бриф: web-ui Resizable — ghost-вариант ручки (без собственной линии)

**Кому:** owner-web-ui
**От:** owner-boost-layout (2026-07-04, follow-up к `web-ui-resizable-handle-contract.md`)
**Приоритет:** P0 — активная ручка дублирует бордер-систему Matrix
**Зона правок:** `packages/web/kit/ui/src/primitives/layout/resizable/` (только)

---

## Контекст / проблема

Предыдущий бриф убрал линию у **неактивной** ручки, но у **активной** линия (`bg-border` hairline) осталась. Для консьюмеров с собственной системой разделителей (Matrix: проп `bordered`) это ломает визуальный контракт:

- `bordered` включён + resize включён → рядом с divider'ом Matrix появляется вторая линия (ручки);
- `bordered` выключен + resize включён → появляется линия, которую консьюмер явно отключил.

Требование продукта: **линии между панелями — исключительно от бордер-системы консьюмера; ручка — только хит-зона + grip-бэйдж, ни в каком состоянии не рисует свою линию.**

## Что сделать

Добавить контейнерный проп, управляющий визуалом ручек:

```ts
export interface IResizableProps {
  // ...
  /**
   * Визуальный вариант ручек.
   * - 'line' (default) — как сейчас: активная ручка рисует bg-border hairline
   *   (shadcn-конвенция, back-compat).
   * - 'ghost' — ручка НИКОГДА не рисует линию (bg-transparent в любом
   *   состоянии). Остаются: хит-зона (after:w-1), pointer-events/drag при
   *   active, grip при `withHandle && active`, focus-visible ring.
   */
  handleVariant?: 'line' | 'ghost';
}
```

Прокинуть: `Resizable` → `ResizableInner` → `ResizableHandle` → новая ось варианта в `resizableHandleCva` (композиция с существующей осью `active`: `ghost` глушит только фон, поведение active — pointer/drag/grip — не трогает).

## Критерии приёмки

- `handleVariant="ghost"` + active: на `[data-corvu-resizable-handle]` НЕТ `bg-border`, drag работает (corvu `disabled=false`), grip виден при `withHandle`.
- `handleVariant="ghost"` + inactive: как сейчас у inactive (прозрачна, pointer-events-none, без grip).
- Дефолт (`'line'` / проп не задан) — поведение бит-в-бит текущее, существующие тесты зелёные.
- Unit-тест на ghost-вариант + story со сравнением line/ghost.
- `pnpm --filter @capsuletech/web-ui build`.

## Follow-up после мержа (зона boost-layout, НЕ в этом PR)

Matrix передаст `handleVariant="ghost"` во все `Layout.Resizable` и уберёт подавление divider'а под активной ручкой (разделители станут чисто функцией `bordered`). Итоговое поведение Matrix:
- `bordered` on → hairline-разделители между слотами всегда, независимо от resize; включённый resize добавляет только grip-бэйджи.
- `bordered` off → никаких линий; включённый resize — только grip-бэйджи.
