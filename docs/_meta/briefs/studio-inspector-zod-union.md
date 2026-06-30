# Brief — web-studio: inspector рендерит ZodUnion-пропсы (cols/gap/rows)

**Зона:** owner-studio (`packages/web/studio/`). Файл — `src/inspector/zod-to-categories.ts`.
**Запуск:** `.\claude-scope.ps1 -Scope studio`. **Тип:** commit-only (push делает architect).
**Приоритет:** medium. Surfaced ревью палитры (web-ui эталон, PR смержен 2026-06-30/07-01).

## Проблема

`schemaToInspectorCategories` (`zod-to-categories.ts:56-67`) маппит в inspector-поля только
`ZodString → text`, `ZodEnum → select`, `ZodBoolean → boolean`, `ZodNumber → number`.
**`ZodUnion` / `ZodRecord` / `ZodArray` молча пропускаются** (graceful degradation, стр. 6).

Последствие: у контейнеров главные пропсы **не отображаются в инспекторе**, потому что в
контрактах они union'ы:
- `grid.contract.ts`: `cols`/`rows` = `z.union([number, string, array])`, `gap`/`gapX`/`gapY` = `z.union([number, string])`.
- `group.contract.ts`: `gap` = `z.union([number, string])`.
- (то же у существующего Flex — `flex.contract.ts`; фикс лечит и его — pre-existing долг.)

При этом пресеты прямо обещают редактирование: `grid.presets.ts:71` — «покрути `cols` в инспекторе (2→3→4)».
Сейчас при выборе Grid-пресета инспектор показывает только `autoFlow`/`inline`/`class`, а `cols`/`gap`/`rows` — нет. UI врёт.

## Фикс

В `schemaToInspectorCategories` добавить обработку `ZodUnion`: развернуть `field._def.options`
(массив member-схем, у каждого `_def.typeName`) и выбрать рендерящийся тип:
- есть `ZodString` среди members → поле `text` (универсально: принимает и `2`, и `repeat(auto-fill, ...)`; число вводится строкой — компонент сам коэрсит). **Рекомендация — text** (не теряет CSS-строки).
- иначе есть `ZodNumber` → `number`.
- иначе — пропустить (как сейчас).

`number|string` и `number|string|array(string)` → оба резолвятся в `text` по правилу выше. Это даёт
рабочее поле для `cols`/`gap`/`rows`, сохраняя возможность ввести сырой CSS.

`ZodRecord` (`style`) и `ZodArray` оставить пропускаемыми (нет осмысленного скалярного поля; `style`
правится не здесь). Не регрессить graceful-skip для действительно немапящихся типов.

## Verify (last-lines в отчёт)
- Unit: расширить `inspector/__tests__` (или добавить рядом) — кейс `z.union([z.number(), z.string()])` → field type `text`; `z.record` → пропущен.
- `pnpm --filter @capsuletech/web-studio test` + `build` + `pnpm nx run web-studio:typecheck` + `pnpm exec biome check --write packages/web/studio` + re-stage.
- Глазами (architect/USER): студия `/workspace/web-studio/store` → клик Grid-пресета → инспектор показывает `cols`/`gap`/`rows`, смена `cols` 2→3 перестраивает канвас.

## Связано
[[project_renderer_convergence]]. Корень из ревью палитры — `docs/_meta/handoff-2026-07-01-palette.md`.
