# Brief — web-ui: Separator `decorative` — реализовать семантику (сейчас no-op)

**Зона:** owner-web-ui (`packages/web/kit/ui/src/primitives/separator/`).
**Запуск:** `.\claude-scope.ps1 -Scope ui`. **Тип:** commit-only (push делает architect).
**Приоритет:** low (a11y-корректность). Surfaced owner'ом в PR #458 (тест осознанно НЕ пинует сломанное).

## Проблема

`separator.tsx:39` прокидывает `decorative` в Kobalte `SeparatorPrimitive`, но у Kobalte 0.13.11
Separator **нет такой опции** — проп утекает в DOM сырым атрибутом `decorative="true"` (невалидный
HTML-атрибут), а элемент рендерится `<hr>` с имплицитной ролью `separator` независимо от флага.
Контракт (`separator.contract.ts`) и инспектор при этом обещают рабочий проп — UI врёт.

## Решение (architect): проп оставить, семантику реализовать в нашей обёртке

Канон Radix/shadcn: `decorative=true` (дефолт) = чисто визуальный разделитель, **убирается из
a11y-дерева**; `decorative=false` = смысловой separator.

В `separator.tsx`:
1. НЕ передавать `decorative` в Kobalte (снять утечку сырого атрибута — исключить из spread).
2. `decorative === true` → рендер с `role="none"` (на `<hr>` явная role перекрывает имплицитную).
3. `decorative === false` → как сейчас: имплицитная `separator`-семантика, для vertical —
   `aria-orientation` (уже работает, запинено тестами #458).

### Готовый патч (подготовлен 2026-07-02, применить + верифицировать прогоном)

`separator.tsx`, return-блок (строки ~36-44) — удалить `decorative={local.decorative}`, добавить `role`:

```tsx
  // Kobalte 0.13.11 SeparatorPrimitive has no `decorative` option — the prop
  // is intentionally NOT forwarded (would leak as a raw invalid DOM attribute).
  // Radix/shadcn semantics implemented here: decorative=true (default) removes
  // the element from the a11y tree via explicit role="none" (overrides the
  // <hr>'s implicit separator role); decorative=false keeps implicit semantics.
  return (
    <SeparatorPrimitive
      orientation={(local.orientation as 'horizontal' | 'vertical') || 'horizontal'}
      role={local.decorative ? 'none' : undefined}
      class={className()}
      style={style()}
      {...others}
    />
  );
```

⚠️ Существующий тест «default orientation → no aria-orientation» (строки ~65-71) использует
`<Separator />` без `decorative={false}` — теперь дефолт даёт `role="none"`. Ожидаемо остаётся
зелёным (aria-orientation зависит только от orientation), но подтвердить фактическим прогоном —
реальность рендера главнее ожиданий.

## Тесты (снять NOT-covered блок из `__tests__/separator.test.tsx`)

- дефолт (`decorative=true`) → `role="none"`, в DOM НЕТ сырого атрибута `decorative`;
- `decorative={false}` → нет `role="none"`, `<hr>`-семантика сохранена; vertical → `aria-orientation`;
- существующие orientation-тесты (#458) не регрессят — поправить, если дефолтная роль теперь `none`.

Обновить комментарий-шапку теста (блок «NOT covered … pending architect decision» → закрыт).
Если у Separator появится README/docSlug позже — упомянуть семантику там же.

## Verify (last-lines в отчёт)

- `pnpm --filter @capsuletech/web-ui test` + `build` + `pnpm nx run @capsuletech/web-ui:typecheck`.
- `pnpm exec biome check --write packages/web/kit/ui` + re-stage.

## Связано

PR #458 (surfaced + orientation-тесты). Родительский бриф — `web-ui-palette-nits.md` п.2.
