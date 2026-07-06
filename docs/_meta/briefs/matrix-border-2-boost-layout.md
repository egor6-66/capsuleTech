# Brief — Matrix border-модель: always-on + per-side opt-out + resize-seam + единый токен (scope `boost-layout`)

**⚠️ Landing вместе с `matrix-border-1-ui.md`** (один cross-package заход, §0.1).
Кит убирает `handleVariant`/`ghost` — этот бриф перестаёт их слать и инвертирует
контракт «divider vs resize-ручка».

## Первопричина (по скринам user, img_9/img_10)
Сейчас на resizable-стыке рядом стоят **два 1px-элемента**: прозрачная ghost-ручка
(`w-px`, занимает место, невидима) + видимый divider Matrix (`border-l border-border/60`).
Это дубль/сдвиг сетки. Правим: на resizable-стыке остаётся **один** элемент — видимая
ручка ресайза, которая И ЕСТЬ divider; Matrix гасит свою сторону на этом стыке.

## Модель бордера (новая)

### 1. Always-on + инверсия флага `bordered`
Сейчас `bordered` — гейт (default false, either-rule включает дивайдеры). Инвертировать
в **opt-out (default true)**: бордеры есть всегда, `bordered={false}` (Matrix-уровень)
или per-slot = точечно гасят. Канон user: «рисовать так, бордеры есть всегда».

### 2. Per-side control (T/R/B/L) — НЕ весь слот
Точечное управление **по сторонам**, не булево на весь слот. Кейс: хедер родителя
(его bottom) + хедер вложенного матрикса (его top) → двойной жирный шов; гасим ОДНУ
сторону. Расширить slot-border-контракт:
```ts
type BorderSides = Partial<Record<'top' | 'right' | 'bottom' | 'left', boolean>>;
bordered?: boolean | BorderSides;   // true/omitted = все стороны; false = ни одной;
                                     // объект = точечный override (неуказанная сторона = on)
```
Провести через: `INormalizedSlot.bordered` (utils.ts), `ICell`/`IRow`/`SlotValue`
object-форма, `normalizeSlotValue`. Сейчас бордер уже по-сторонний (`border-l`/`border-t`
дивайдеры) — расширить до всех 4 сторон, где нужно (вложенные фреймы).

### 3. Resize-seam заменяет ОДНУ сторону
Когда на стыке слота активна resize-ручка — Matrix гасит СВОЙ бордер **на этой стороне**
(например только left), ручка ресайза (теперь `line`, брифе #1) рисует её. Не весь
бордер слота — только сторону стыка. Это ИНВЕРСИЯ текущего:
`dividerBetweenCells`/`dividerBetweenRows` (utils.ts) сейчас говорят «resize не влияет,
ручки ghost» — теперь divider на стороне активного resize-стыка = **off** (рисует ручка).
Комментарии в utils.ts:30-33 переписать под новый контракт.

### 4. Единый токен
Все `border-border/60` → `border-border` (полный `--border`, как ручка ресайза в брифе #1
и Card/Input в ките). Места (грепни `border-border/60` по boost/layout): `cell.tsx:128,170`,
`content.tsx:381,455,580` (+ проверить остальные). Канон user: «все бордеры одинаковы».

### 5. Убрать `handleVariant="ghost"`
3 места: `matrix/rows/flex-row.tsx:173`, `matrix/content.tsx:414,510`. Проп удалён в ките.

## Реконсиляция (surface, не глуши)
Решение 2026-07-04 сняло «полный border + rounding» у слотов (слоты = общее пространство,
не карточки; cell.tsx:76-79). Новая per-side модель **частично возвращает** фреймы (для
вложенных). Совместить: внутренние швы одного матрикса — **одинарной ширины** (per-side
дедуп, как сейчас), rounding НЕ возвращаем; per-side control = только для внешних кромок /
вложенных наложений. Если при реализации это конфликтует со «shared space» принципом —
**СТОП + эскалация к architect**, не решай в одну сторону молча.

## Тесты
`__tests__/divider-and-resize-override.test.tsx` — контракт инвертирован (ручка теперь
РИСУЕТ линию на resize-стыке, Matrix гасит свою сторону) → переписать. Добавить кейсы:
per-side opt-out (`bordered:{bottom:false}`), always-on default, единый токен.
`matrix.tsx` doc-comment (строки ~130-132 про ghost) обновить. `OWNERSHIP.md` — новая
border-модель.

## Verify
`nx run @capsuletech/boost-layout:typecheck` + `:test` + `:build`. Grep
`handleVariant`/`border-border/60` по `boost/layout/src/**` = 0. Живой matrix: на
resizable-стыке одна линия (не две), сетка не сдвигается; вложенный матрикс без двойного
шва при per-side opt-out — верификацию вида снимет user в браузере.
