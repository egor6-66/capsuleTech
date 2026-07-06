# Brief — Resizable: снять `ghost`, единый border-токен (scope `ui`)

**⚠️ Landing вместе с `matrix-border-2-boost-layout.md`** (один cross-package заход,
§0.1). Кит убирает `handleVariant` → Matrix перестаёт его слать; врозь = TS-краш.
Реверсит прошлый бриф `web-ui-resizable-ghost-handle.md` (ghost больше не нужен).

## Контекст
Matrix рисует свой divider сам, поэтому раньше глушил линию ресайз-ручки через
`handleVariant="ghost"`. Новая модель Matrix инвертируется: на resizable-стыке
**ручка ресайза И ЕСТЬ divider** (Matrix гасит свою сторону). Значит `ghost` (ручка
без линии) больше не нужен — ручка всегда рисует стандартный hairline. Плюс: все
бордеры в продукте приводим к **единому токену** (`border`), без Matrix-специфичного
`/60`.

## Задача

### 1. Снести `ghost`-вариант
- `packages/web/kit/ui/src/primitives/layout/resizable/_resize/variants.ts` —
  `resizableHandleCva`: убрать блок `variant: { line, ghost }` и `compoundVariants`.
  Активная ручка рисует hairline **единым токеном `bg-border`** (не `/60`); неактивная —
  `bg-transparent pointer-events-none` (как сейчас). Оставить `active`-вариант как есть.
- `_resize/primitives.tsx` — `ResizableHandleProps`: убрать проп `variant` + из
  `splitProps`; в `createStyle` убрать getter `variant`.
- `resizable.tsx` — убрать проброс `handleVariant` (строки ~43, 76, 165) из
  `ResizableInner` и корневого `Resizable`.
- `interfaces.ts` — убрать `handleVariant?` из `IResizableProps` и тип
  `ResizableHandleVariant`.

### 2. Стори/тесты/доки
- `resizable.stories.tsx` — удалить историю `handleVariant: line vs ghost` (~89).
- `__tests__/resizable.test.tsx` — удалить `describe('Resizable — handleVariant ghost
  contract')` (строки ~439-495).
- `OWNERSHIP.md` — снять упоминания `handleVariant`/`ghost`.

## Единый токен (важно, канон user: «все бордеры одинаковы»)
Hairline активной ручки = `bg-border` (полный `--border`-токен, как у Card/Input в
ките). НЕ `border/60`. Matrix со своей стороны поднимет свои дивайдеры `/60 → border`
(брифе #2) — так ручка и дивайдеры Matrix совпадают в 1 токен, шов ровный.

## Verify
`nx run @capsuletech/web-ui:build --skip-nx-cache` + `:test`. Standalone Resizable
(без Matrix) рисует ту же линию, что и раньше по умолчанию (`line` был дефолтом) —
регресса вида нет. Grep `ghost`/`handleVariant` по `layout/resizable/**` = 0.
