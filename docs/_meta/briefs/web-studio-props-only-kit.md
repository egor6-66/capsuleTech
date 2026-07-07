# Бриф #2: web-studio — обнулить raw-классы → props-only (эталон, kit-adoption)

**Зона:** owner-studio (`packages/web/workspace/studio/`). Коммить scope-тегом `studio`, **НЕ пушить** — push/merge architect после verify ([[feedback_agents_commit_only_user_pushes]]).

**Пререквизит выполнен:** бриф #1 смержен в дерево — `Ui.Typography` умеет `mono` / `weight` / `variant="overline"` (проверено architect'ом: web-ui 700 тестов + typecheck + build зелёные).

**Перед стартом:** `packages/web/workspace/studio/OWNERSHIP.md`; `pnpm --filter @capsuletech/web-studio test` — зелёный baseline (84).

---

## Зачем (канон)

Пакет НЕ содержит raw-классов — весь визуал из web-ui props-only ([[feedback_primitives_props_only_no_raw_classes]], [[feedback_use_ui_kit_everywhere]], component-model канон). Сейчас в `src/` **64 raw-класса в 18 файлах** — типографика + мелкие контейнеры/паддинги, набитые руками. Kit это полностью закрывает (пререквизит #1 добил недостающие ручки Typography).

**Цель — грепом ноль:** после брифа `grep -rE 'class="[^"]*(flex|grid|gap-|rounded|border|bg-|text-|px-|py-|p-|w-|h-|shadow|absolute|space-)' src/` = пусто (кроме обоснованного residual, см. ниже).

---

## Карта замен (raw-класс → kit)

| Raw-паттерн | → Kit |
|---|---|
| `text-xs`/`text-sm`, `text-muted-foreground`, `font-medium`, `font-mono`, `text-[10px] uppercase tracking-wide` | `<Typography size="xs" tone="muted" weight="medium" mono variant="overline">` (комбинируй ручки; import `@capsuletech/web-ui/typography`) |
| `<div class="flex ...">` / `flex-col gap-2` / `flex flex-wrap gap-1` | `<Flex orientation="vertical" gap={2} wrap="wrap">` (уже частично используется) |
| `px-2 py-1`, `p-2`, `pl-3`, `mt-1` контейнерные паддинги | `<Flex px={2} py={1} p={2} gap={...}>` (у Flex есть `p`/`px`/`py`/`gap`/`sizing`/`border`/`overflow`) |
| chip `rounded bg-muted/40 px-1.5 py-0.5 font-mono` (варианты/теги) | `<Badge tone="muted">` (import `@capsuletech/web-ui/badge`) |
| «key = value» списки (ManifestBlock defaults, ContractBlock rules) | `<Card>` с `meta={[{key, value}]}` ЛИБО `<Flex>`+`<Typography>` — на твоё усмотрение (Card.meta = каноничнее для key:value фасетов) |
| empty-state `<div class="px-3 py-4 text-xs text-muted-foreground">Выберите…</div>` | `<Placeholders.Empty>` (import `@capsuletech/web-placeholders`; как в learn) |
| `rounded bg-muted/30 p-2` смысловая рамка (пресет-описание) | `<Card padding="sm">` или `<Flex p={2}>` + border-токен |

Все spacing-числа Flex/Card = 1:1 с Tailwind-шкалой (`px={2}` ≡ `px-2`). Токены НЕ вводим — только существующие props.

## Файлы (18, по убыванию грязи)

`info/ContractBlock.tsx`(14) · `info/ManifestBlock.tsx`(10) · `tree/TreeRow.tsx`(5) · `palette/ComponentSegments.tsx`(5) · `styles/StylesPanel.tsx`(4) · `tree/NodePalette.tsx`(4) · `inspector/fields/BooleanField.tsx`(4) · `info/ReadmeBlock.tsx`(3) · `inspector/fields/NumberUnitField.tsx`(3) · `shared/dragChip/DragChip.tsx`(2) · `welcome/Welcome.tsx`(2) · `tree/RowLabel.tsx`(2) · `palette/PresetPreview.tsx`(1) · `info/EmptyState.tsx`(1) · `inspector/Inspector.tsx`(1) · `inspector/PropsPanel.tsx`(1) · `tree/Row.tsx`(1) · `tree/Tree.tsx`(1).

Пути под `src/modules/*` кроме `shared/dragChip/`.

## Зависимость

`@capsuletech/web-placeholders` в `package.json` studio НЕТ — добавь в `dependencies` (`workspace:*`). tsconfig-путь уже есть (architect). После правки `package.json` — `pnpm install` в корне (или скажи architect'у).

## Residual (surface, не глуши)

Если для узкого кейса нет kit-эквивалента (напр. native `<details>/<summary>` disclosure, или `cursor-pointer` на нём) — **минимальный functional-класс допустим**, но **перечисли такие места в отчёте** как residual для обсуждения ([[feedback_surface_dont_silently_chase]]). Не изобретай уродливые обходы и не тащи новый composite без обсуждения ([[feedback_discuss_new_component]]) — если чувствуешь, что кейс просит новый kit-блок, СТОП + опиши в отчёте.

---

## Verify (перед commit)

- `pnpm --filter @capsuletech/web-studio test` — зелёный (84+, поведение то же).
- `pnpm nx run @capsuletech/web-studio:typecheck` — 0.
- `pnpm nx run @capsuletech/web-studio:build` — собирается.
- **Греп-инвариант:** raw-класс-греп по `src/` = пусто (или только задокументированный residual).
- ⚠️ **Визуал НЕ верифицируешь сам** (канон: браузер = architect/user). В отчёте пометь, что требуется живой eyeball `:8080/studio/` — конверсия классов→props рискует визуальным дрейфом, jsdom-тесты его не ловят.

В отчёте architect'у: тронутые файлы, список residual (если есть), реальный хвост test/typecheck/build, греп-результат.

## Готово =
raw-классы обнулены (греп пуст / только residual), весь визуал props-only из web-ui, test/typecheck/build зелёные. Финальный визуальный eyeball — за architect/user.
