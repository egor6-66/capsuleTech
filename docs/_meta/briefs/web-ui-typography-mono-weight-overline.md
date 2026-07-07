# Бриф: web-ui — Ui.Typography +mono +weight +overline (kit-first разблокировка studio-эталона)

**Зона:** owner-web-ui (`packages/web/kit/ui/`). Коммить scope-тегом `web-ui`, **НЕ пушить** — push/merge architect после verify ([[feedback_agents_commit_only_user_pushes]]).

**Перед стартом:** `packages/web/kit/ui/OWNERSHIP.md`, `docs/_meta/web-ui.md` (если есть). Прогони `pnpm --filter @capsuletech/web-ui test` — зелёный baseline (зафиксируй хвост).

---

## Зачем

studio-пакет доводим до эталона (обнулить 64 raw-класса → props-only, [[feedback_primitives_props_only_no_raw_classes]]). Его info/tree/inspector-блоки набиты `font-mono`, `font-medium`, и micro-label'ом `text-[10px] uppercase tracking-wide`. `Ui.Typography` сейчас даёт `tone`/`size`/`align`/`dim`, но **этих трёх ручек нет** → студия не может уйти в props-only без них. Канон **kit-first**: сначала примитив, потом потребитель ([[feedback_canon_first_before_code]], [[feedback_product_wide_kit_layering]]).

**Токены НЕ трогаем** ([[feedback_token_set_frozen]]) — только utility-class варианты (`font-mono`/`font-medium`/`uppercase tracking-wide`), как уже сделано для `align`/`size`.

Файлы: `primitives/typography/{typography.tsx, variants.ts, interfaces.ts, typography.manifest.tsx, typography.stories.tsx, __tests__/typography.test.tsx}`.

---

## Что добавить

Паттерн — **presentational-пропсы через lookup-таблицы** (как существующие `ALIGN`/`TONE`/`SIZE` в `typography.tsx` + поля в `ITypographyProps`). Композируются поверх `variant`, НЕ заменяют его.

### 1. `mono?: boolean`
- `interfaces.ts` — новое поле + докстринг («`font-mono` для кода/id/значений; композируется с `tone`/`size`»).
- `typography.tsx` — в `splitProps` presentational-группу добавить `'mono'`; в `finalClass()` подмешать `presentational.mono && 'font-mono'`.

### 2. `weight?: 'normal' | 'medium' | 'semibold' | 'bold'`
- `interfaces.ts` — поле + докстринг («вес поверх варианта; для label'ов/акцентов вместо raw `font-medium`»).
- `typography.tsx` — lookup `WEIGHT = { normal:'font-normal', medium:'font-medium', semibold:'font-semibold', bold:'font-bold' }`; в `splitProps` + `finalClass()` (`presentational.weight && WEIGHT[presentational.weight]`).

### 3. `variant: 'overline'` (CVA-вариант)
- `variants.ts` — в `variants.variant` добавить `overline: 'text-[10px] uppercase tracking-wide leading-none'` (цвет НЕ баке́ем — идёт через `tone`; студия зовёт `<Typography variant="overline" tone="muted">`). Точный класс — на твоё усмотрение (главное: micro-uppercase-label; `text-[11px]`-мелочь студии закрывается `size="xs"`, отдельный вариант не нужен).

---

## Обвязка (обязательна для эталона примитива)

- **`typography.manifest.tsx`** — примитив-манифест ЧИТАЕТ studio-инспектор/палитра. Добавь новые пропсы/вариант в манифест (surface: `mono`/`weight`-поля, `overline` в список вариантов), иначе они не будут доступны в дизайнере. Сверься с форматом существующих полей манифеста.
- **`typography.stories.tsx`** — стори на `mono`, `weight`, `overline` (+ комбинацию `variant="overline" tone="muted"` и `mono size="xs" tone="muted"` — это целевой studio-кейс).
- **`__tests__/typography.test.tsx`** — по тесту на каждую ручку: `mono`→класс `font-mono`; `weight="medium"`→`font-medium`; `variant="overline"`→uppercase-класс; композиция `mono`+`tone="muted"`+`size="xs"` даёт все три класса разом.

---

## Verify (перед commit)

- `pnpm --filter @capsuletech/web-ui test` — зелёный, число тестов выросло.
- `pnpm nx run @capsuletech/web-ui:typecheck` — 0 ошибок.
- `pnpm nx run @capsuletech/web-ui:build` — собирается.
- Sanity: существующие потребители Typography не сломаны (новые пропсы опциональны, дефолты сохраняют текущий рендер).

В отчёте architect'у: тронутые файлы + реальный хвост test/typecheck/build.

## Готово =
`Ui.Typography` умеет `mono`/`weight`/`overline` (props-only, токены не тронуты), покрыто тестами+сторёй, манифест обновлён. Это разблокирует бриф #2 (owner-studio → props-only одним махом).
