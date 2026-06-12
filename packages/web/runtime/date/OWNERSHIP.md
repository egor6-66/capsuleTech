---
name: "@capsuletech/web-date"
owner-agent: главный (стюардит главный assistant)
group: web_base
zone: runtime
status: alpha
priority: P3
last-updated: 2026-06-11
---

# OWNERSHIP — @capsuletech/web-date

> Date/time utility layer for capsule. Pure logic — converters + filters. No UI
> (date pickers live in `@capsuletech/web-ui`, wrapping Kobalte), no reactivity yet.

## Состояние (читать ПЕРВЫМ)

- **Zone:** `runtime` — pure date/time utilities; engine — date-fns v4.
- **Status:** `alpha` (0.1.0) — конвертеры + range-фильтры работают.
- **Priority:** **P3** — опциональный helper; апп может использовать date-fns напрямую.
- **Maturity bar (до beta):**
  - Reactivity layer (Solid-aware date utilities).
  - Locale-aware formatters.
  - Tz-aware helpers.
- **Active blockers:** нет.
- **Roadmap:**
  1. Reactivity для активной локали.
  2. Tz helpers.
- **Last activity:** 2026-06-11 (canon refresh).

## Vendor stack (ADR 047 D3)

- **date-fns** (`^4`, dep) — main engine. https://date-fns.org/
- **Solid.js** (для future reactivity) — пока без зависимости.

## Зона ответственности

`packages/web/date/` — конвертеры форматов, range-фильтры, активная локаль.
Движок — **date-fns v4** (external, резолвится у consumer'а).

## Публичный API

### `.` (root) / `@capsuletech/web-date`
Реэкспорт всего: format + filters + locale + types.

### `/format`
- `formatDate(input, name, opts?)` — именованные форматы: `date.short` `date.long`
  `date.numeric` `time` `datetime` `relative` `iso`. Невалидный вход → `''`.
- `parseDate(input, name?, opts?)` — строгий парс по именованному паттерну, иначе best-effort.
- `normalizeDate(input)` — `DateInput → Date | null`.
- `isValidDate(input: unknown)` — safe-guard.

### `/filters`
- `range(preset | {from,to}, opts?)` — пресеты: `today` `yesterday` `last7days`
  `last30days` `thisWeek` `lastWeek` `thisMonth` `lastMonth` `thisQuarter`
  `lastQuarter` `thisYear`. Границы инклюзивные.
- `inRange(value, range)` — предикат для table-фильтров.
- `rangePresets()` — упорядоченный `{ id, label }[]` для dropdown'а.

### locale
- `setDateLocale(locale)` / `getDateLocale()` — module-level singleton date-fns
  `Locale`. Дефолт `enUS` (fallback, не бизнес-выбор). App синхронизирует с
  `@capsuletech/web-intl` через `setDateLocale`.

`DateInput = Date | string | number`.

## Quirks

- **`relative` + `now`:** `formatDistanceToNow` всегда читает реальные часы. При
  заданном `opts.now` используется `formatDistance(date, now)` — детерминированно/тестируемо.
- **`date-fns` external:** помечен в `vite.config.mts`; consumer обязан иметь его в
  node_modules (объявлен как `dependency`, pnpm подтянет).
- **Локализованные токены** (`P`/`p`) рендерят по активной локали; `date.numeric`
  фиксирован `dd.MM.yyyy` намеренно.

## Roadmap

- **v2 `/reactive`** — `createDate` / `createDateRange` Solid-сигналы.
- **v2 `/tz`** — opt-in timezone через `@date-fns/tz` (таймзона из конфига, air-gapped-safe).
- **UI** — `DateInput` / `DateRangePicker` / `Calendar` в `@capsuletech/web-ui`
  (обёртка Kobalte DatePicker), `web-date` даёт логику.
- **intl-bridge** — авто-sync активной локали из `@capsuletech/web-intl`.

## Тесты

`src/__tests__/format.test.ts` (15), `src/__tests__/filters.test.ts` (15). 30 green.
`pnpm --filter @capsuletech/web-date test`.

## Release

Группа **web_base** (fixed-versioning, tag `web@{version}`).
