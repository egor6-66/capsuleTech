# Brief — web-ui: ниты палитры (плитки пресетов, Separator-тест, README+docSlug)

**Зона:** owner-web-ui (`packages/web/kit/ui/`).
**Запуск:** `.\claude-scope.ps1 -Scope ui`. **Тип:** commit-only (push делает architect).
**Приоритет:** low. Follow-up ревью палитры-эталона (#455, handoff `docs/_meta/handoff-2026-07-01-palette.md`).

## 1. Плитки Flex/Grid-пресетов: `ui.Card` → нейтральный бокс

**Где:** `primitives/layout/flex/flex.presets.ts:47` и `primitives/layout/grid/grid.presets.ts:35-47` — `tileNode` строит плитки-плейсхолдеры как `type: 'ui.Card'`.

**Проблема:** Card тащит свой хром (shadow / border / padding / max-w) → 56px-плитка в превью палитры рисуется крупнее задуманного и с лишним рельефом. Плитке нужен только цветной прямоугольник, показывающий track/wrap.

**Фикс:** заменить тип плитки на `ui.Layout.Flex` (пустой, без детей) с тем же inline-стилем:
```ts
{ width: '100%', height: '56px', background: 'var(--color-muted)', 'border-radius': 'var(--radius-md)' }
```
- Стиль — **инлайн через CSS-токены**, НЕ Tailwind-классы (конвенция файла: пресеты не требуют content-scan у консьюмера — см. шапку `grid.presets.ts`).
- `Group`/`List`-пресеты (дети `ui.Button`) — НЕ трогать, там смысловые дети.
- `Card`/`Field`-пресеты — НЕ трогать (там `ui.Card` — сама суть пресета).

## 2. Separator: закрепить `orientation`/`decorative` тестом (код НЕ менять)

Architect проверил: пропсы **живые** — `separator.tsx:11` (mergeProps-дефолты) и `:37-39` (прокидка в Kobalte `SeparatorPrimitive`, variant дерайвится из orientation через `activeVariant`). Мёртвых полей контракта нет, фиксить нечего.

**Задача:** unit-тест в `primitives/separator/__tests__/`, чтобы контракт-инспектор-поля (`separator.contract.ts:11-13`) не отвалились молча при будущих правках:
- `orientation="vertical"` → рендер с `data-orientation="vertical"` (или vertical-variant класс);
- `decorative=false` → элемент несёт `role="separator"` (Kobalte-семантика); `decorative=true` (дефолт) — нет.

## 3. README + docSlug для 9 новых примитивов палитры

**Проводка (как работает):** `README.md` рядом с примитивом → `docs-builder` собирает в `dist/docs.json` (export `./docs.json` в package.json:14) → studio Info-вкладка (`ReadmeBlock` → `DocPage slug={manifest.docSlug}`). Slug = путь от `primitives/`: `web-ui/primitives/layout/grid`, `web-ui/primitives/card`, …

**Текущее:** README+docSlug есть у 6 старых (Button/Input/Toggle/Select/Typography/Flex). У 9 новых из #455 (Label, Separator, Spinner, Skeleton, Group, Grid, List, Card, Field) — ни README, ни docSlug → Info-вкладка показывает fallback «Документация пока не подключена».

**Задача:** написать README по образцу эталона (`primitives/button/README.md`) + проставить `docSlug` в манифесте. Правила:
- `docSlug` ТОЛЬКО в паре с реально написанным README (fallback «Документ не найден» хуже, чем «не подключена») — не ставить slug авансом.
- Приоритет: контейнеры/композиции — **Group, Grid, List, Card, Field** (их крутят в store/creator). Leaf (Label/Separator/Spinner/Skeleton) — короткие, по остатку времени; не успел — оставить без docSlug, не блокер.
- Можно отдельным вторым коммитом (п.1+п.2 — первый).

## Verify (last-lines в отчёт)

- `pnpm --filter @capsuletech/web-ui test` + `build` + `pnpm nx run web-ui:typecheck`.
- `pnpm exec biome check --write packages/web/kit/ui` + re-stage.
- Глазами (architect/USER, :3050 store): Flex/Grid-пресеты — плитки плоские нейтральные (без Card-рельефа), перестройка `cols` живёт; Info-вкладка Grid/Card показывает README. ⚠️ После пересборки dist web-ui — рестарт студийного dev с `--force` (иначе stale pre-bundle, грабля 2026-07-01).

## Связано

`docs/_meta/handoff-2026-07-01-palette.md` (источник нитов). Парный бриф той же волны — `studio-inspector-zod-union.md` (owner-studio, ZodUnion в инспекторе).
