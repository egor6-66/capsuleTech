---
title: owner-web-ui — Phase W4 part 2 brief
description: Bundle-size assertion tests + CI manifest drift-guard + WEIGHT_MAP recalibration по findings из phase 1.
status: documented
last_updated: 2026-06-12
---

# Brief — owner-web-ui — Phase W4 part 2 (bundle assertions + recalibration)

> **READ FIRST:** `docs/_meta/owner-agent-canon.md` — общие правила для owner-* агентов.
> **Predecessor:** W4 phase 1 (PR #311 merged) — manifest infra `src/manifest/types.ts` + `scripts/build-manifest.ts` + `pnpm build:manifest` script.
> **Canon:** `docs/_meta/web-ui.md` секция «Weight gradient & size manifest».

## Цель

Закрыть W4-трек двумя задачами:
1. **vitest bundle-size assertion test** — лимит на размер L0-subpath'ов + assert что L0 НЕ содержит interactive-Kobalte в графе. Регрессия (увеличение size, добавление heavy dep) ловится автоматически.
2. **CI drift-guard на `manifest.json`** — diff в CI после `pnpm build:manifest` = failure. Заставляет commit'ить актуальный manifest при изменении компонента.
3. **Recalibrate WEIGHT_MAP** — phase 1 показал что `input` и `button` не лезут в L0-canon-приемлемый бюджет. Перенести / split / fix.

## Phase 1 findings (что нужно решить)

Из PR #311 initial run (`pnpm --filter @capsuletech/web-ui build:manifest`):

| Subpath | Actual gzip | Expected L0 | Action |
|---|---|---|---|
| `slot` | 0.48 kB | ≤ 1 | L0 ✅ |
| `label` | 2.12 kB | ≤ 3 | L0 ✅ |
| `typography` | 2.55 kB | ≤ 3 | L0 ✅ |
| `spinner` | 2.25 kB | ≤ 3 | L0 ✅ |
| `table` | 2.25 kB | ≤ 3 | L0 ✅ |
| `textarea` | 2.55 kB | ≤ 3 | L0 ✅ |
| `separator` | 3.72 kB | ≤ 4 | L0 ✅ |
| `field` | 3.73 kB | ≤ 4 | L0 ✅ |
| `widgetFrame` | 3.89 kB | ≤ 4 | L0 ✅ |
| `skeleton` | 4.33 kB | ≤ 5 | L0 ✅ |
| `card` | 5.08 kB | ≤ 5 | borderline — bump до 6 ИЛИ проверить optimization |
| `list` | 10.44 kB | ≤ 12 | L0 ✅ |
| `flex` | 12.35 kB | ≤ 14 | L0 ✅ (corvu/resizable inside) |
| `layout` | 13.07 kB | ≤ 14 | L0 ✅ |
| `group` | 13.41 kB | ≤ 14 | L0 ✅ borderline |
| `button` | **24.39 kB** | ≤ 8 | ⚠️ **DRIFT** — see below |
| `input` | **47.30 kB** | ≤ 8 | ⚠️ **DRIFT** — see below |

### `button` 24.39 kB — drift cause

Главная гипотеза: `lucide-solid` pulls весь icon-pack при использовании icon-prop (через `import { Map as MapIcon } from 'lucide-solid'` или `<Button leftIcon={<Map/>}/>`). lucide-solid не tree-shake'ается per icon — это известное ограничение.

**Варианты решения:**
- (a) **Drop icon-prop из button** — пусть consumer passes готовый JSX (`<Button>{<MapIcon/>}<span>Submit</span></Button>`). lucide-solid не пулится из button-graph'а. Button становится ~3 kB.
- (b) **Lazy icon-prop** — button делает `lazy(() => import('lucide-solid'))` для icon. Несколько kB stay но full pack не bundle'ится статически.
- (c) **Accept 24 kB как L0** — но тогда ставим bar выше, и любой L0-subpath с lucide попадёт в эту категорию.

**Рекомендация:** (a) cleanest. Button должен принимать `children` универсально; icon — это children. Это **минимальное breaking** для consumer'ов (changed prop API, но миграция тривиальная). Опционально: keep `leftIcon`/`rightIcon` props но deprecate и сделай их **lazy-imported** (b) — meet in the middle. Обсуди со мной (главным) перед commit'ом.

### `input` 47.30 kB — drift cause

Главная гипотеза: Kobalte form-context (хотя `WEIGHT_MAP` сейчас L0) или re-export каких-то heavy primitives через input subpath.

**Варианты:**
- (a) **Re-classify L1** — input всё ещё native, но с Kobalte form pattern. L1 — это «interactive + a11y pattern overhead»; input + form-context подходит.
- (b) **Lazy form-context** — если есть способ извлечь form-coupling в отдельный sub-export.
- (c) **Inspect graph** — посмотри externals в manifest.json для input. Если `@kobalte/core/<something>` есть — точно L1. Если нет — это что-то другое heavy. **First step.**

**Рекомендация:** начни с (c) — `cat dist/manifest.json | jq '.primitives[] | select(.name == "input") | .externals'` — что внутри. По результату решай: re-classify L1 или dig deeper. Обсуди со мной.

## Что делать

### 1. Recalibrate WEIGHT_MAP

`packages/web/ui/scripts/build-manifest.ts`:
- Если button → L0 with reduced size (вариант (a)/(b)): keep L0.
- Если input → L1 (вариант (a)): move `input: 'L1'` в WEIGHT_MAP.
- Update `docs/_meta/web-ui.md` секцию Weight Gradient — финальный seed list + financial числа.

### 2. Bundle-size assertion vitest test

**Файл:** `packages/web/ui/test/bundle-size.test.ts` (или `src/manifest/__tests__/bundle-size.test.ts`).

**Подход:**
- Читает `dist/manifest.json` (предварительно генерится через `pnpm build:manifest` либо в test'е через прямой вызов script'а).
- Для каждого L0 entry — assert `sizeKB <= <calibrated-limit>`. Лимиты — финальные после recalibration (predefined в test'е, обновляемые по мере evolution).
- Для каждого L0 entry — assert `externals` НЕ содержит запрещённое: `@kobalte/core/dropdown-menu`, `@kobalte/core/popover`, `@kobalte/core/dialog`, `@kobalte/core/select`, `@kobalte/core/combobox`, `@kobalte/core/slider`, `@kobalte/core/accordion`, `@kobalte/core/tooltip`. Allowlist: `@kobalte/core/polymorphic`, `@kobalte/core/separator`, `@kobalte/core/skeleton`.
- Для L1 entry — НЕТ size lower bound (heavy ok); assert `externals` содержит соответствующий Kobalte (sanity check).

**Запуск:** `pnpm --filter @capsuletech/web-ui test`. Test должен сначала pre-flight'нуть что dist/manifest.json существует; если нет — `console.warn` + skip с явным message что нужен build first. Альтернативно: run `pnpm build && pnpm build:manifest` в `beforeAll`. Решай по UX (slow vs reliable).

### 3. CI drift-guard на manifest.json

Два варианта:

**(a) Commit manifest.json + git-diff guard:**
- Add `dist/manifest.json` to git (НЕ в `.gitignore`).
- CI step: `pnpm build:manifest && git diff --exit-code packages/web/ui/dist/manifest.json` — fails if manifest drifted (developer didn't commit fresh).
- Cons: commit-noise при каждом изменении компонента.

**(b) Build-time check + ephemeral compare:**
- `dist/manifest.json` остаётся generated artifact (в `.gitignore`).
- CI step: `pnpm build:manifest && pnpm test:bundle-size` — test читает manifest, ассертит. Drift поймает.
- No commit-noise. Cleaner.

**Рекомендация: (b)** — manifest = generated, не commit-носим. Bundle-size test покрывает drift detection.

## Workflow

- Worktree per task: `git worktree add ../capsule-w4p2-wt origin/main` → branch `feat/web-ui-bundle-size-assertions-w4-p2`.
- PR title: `feat(web-ui): bundle-size assertions + WEIGHT_MAP recalibration (W4 phase 2 / adr 047)` — lowercase subject, не `@`/digit/uppercase в начале.
- Никогда `git add -A` / `git restore` — explicit paths.

## Verify

- `pnpm --filter @capsuletech/web-ui test` green (новый bundle-size test).
- `pnpm --filter @capsuletech/web-ui build && pnpm --filter @capsuletech/web-ui build:manifest` — clean run.
- `cat dist/manifest.json | jq '.primitives[] | {name, weight, sizeKB}'` — sanity check sizes.

## Что НЕ делает

- **B6-placeholder (Ui.Map/Flow/Chart)** — отдельный brief в `docs/_meta/briefs/owner-web-ui-B6-light-placeholders.md`.
- **Button/input api refactor full breaking** — если выбран вариант (a) (drop icon-prop) — это **отдельный PR** через main steward, поскольку breaking. В этом PR — phase 2 фокус на test + recalibration. Button/input drift фиксируется ИЛИ через простой re-classification ИЛИ через TODO/note в test'е + brief для отдельного PR.

## Refs

- W3 canon: `docs/_meta/web-ui.md` секция «Weight gradient & size manifest» — обновить финальные числа.
- W4 phase 1: PR #311 — manifest infra базовая.
- `docs/_meta/web-zones/kit.md` — kit invariants.
- ADR 047 D3 — vendor transparency.
