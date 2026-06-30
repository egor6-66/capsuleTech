# Handoff — 2026-07-01 (палитра студии эталонизирована; follow-ups)

> **Зачем этот файл в репо, а не в памяти:** завтра сессия идёт с ДРУГОЙ машины — локальная
> память архитектора (`~/.claude/.../memory/`) туда не синкается. Этот док — source of truth
> для подхвата. Прочитать ПЕРВЫМ.

## Что сделано и смержено (сегодня)
**Вся палитра студии доведена до эталона** (owner-web-ui + USER). 9 компонентов получили тройку
`*.contract.ts` + `*.presets.ts` + перепровязанный `*.manifest.tsx` (как Button/Input/Toggle):
- Простые leaf: **Label, Separator, Spinner, Skeleton**.
- Контейнеры: **Group, Grid (`ui.Layout.Grid`), List**.
- Композиции: **Card, Field** (многоуровневые `ui.Card.*` / `ui.Field.*` деревья).
- Усилен `manifest/__tests__/registry.test.ts` (id-наборы, tree-integrity, parentId back-links, root-типы).

Браузер-verified USER'ом (палитра :3050 → Store, пресеты кликаются, канвас рисует). Смержено PR
по web-ui (см. git log `feat(web-ui): palette etalon ...`).

**Грабля сессии (для памяти):** после пересборки web-ui dist студийный dev-сервер (:3050) держал
старый pre-bundled web-ui → новый компонент (Group) не появлялся в палитре. Лечение — рестарт
dev с re-optimize (`--force`). Код был верен; см. [[feedback_rebuild_dist_after_capsule_ts_edit]].

## ⏭️ TODO на завтра (по итогам ревью; USER добивает)

### 1. owner-studio — ZodUnion в инспекторе (PRIMARY, medium)
Бриф: **`docs/_meta/briefs/studio-inspector-zod-union.md`**.
Корень: `studio/src/inspector/zod-to-categories.ts:56-67` маппит только String/Enum/Bool/Number;
`ZodUnion` пропускается → у Grid/Group главные пропсы `cols`/`gap`/`rows` НЕ видны в инспекторе,
хотя пресет-копи обещает их крутить. Лечит заодно Flex (pre-existing). Запуск `.\claude-scope.ps1 -Scope studio`.

### 2. owner-web-ui — ниты (low)
Запуск `.\claude-scope.ps1 -Scope ui`.
- **Grid-плитки = `ui.Card`** как цветной box (`primitives/layout/grid/grid.presets.ts:35-47`). Card тащит
  shadow/border/padding/`max-w-sm` → 56px-плитка рисуется крупнее задуманного (это и есть визуал-нит).
  Заменить на нейтральный box (Flex с bg-токеном), либо обнулять Card-хром в props плитки.
- **Separator** теперь светит `orientation`+`decorative` в инспекторе (`separator.contract.ts:11-13`) —
  подтвердить, что компонент реально их обрабатывает (kobalte SeparatorRoot); иначе мёртвые поля.
- **`docSlug`** не задан ни у одного (у эталона Button — есть). Добавить `docSlug: 'web-ui/primitives/<name>'`
  ТОЛЬКО там, где реально есть README в docs-registry; иначе оставить как есть.

### 3. (контекст) `style: z.record`/`class` в propsSchema контейнеров
НЕ баг: инспектор их тихо скипает (FieldRenderer `<Switch>` без fallback + zod-to-categories пропускает
record). Нужны для выживания `defaultProps.style` при zod-parse. Трогать не обязательно — оставлено осознанно.

## Где что лежит
- web-ui палитра: `packages/web/kit/ui/src/primitives/*/{*.contract.ts,*.presets.ts,*.manifest.tsx}` + `src/manifest/registry.ts` (массив `ALL`) + `manifest/types.ts` (`IPrimitiveManifestEntry`/`IPreset`).
- Палитра студии: `packages/web/studio/src/palette/ComponentsPalette.tsx` (гейт `hasPresets`), `src/inspector/` (поля).
- Резолв пресета в канвасе: renderer `{ui:Ui}`, типы нод = dot-path (`ui.Card.Header` → `Ui.Card.Header`).

## Серверы
host playground :3050, remote universal-canvas :3000 (поднимаются `pnpm dev` из app-дир; после смены lockfile/dist ждать Vite re-optimize ~30-60с, при необходимости `--force`).
