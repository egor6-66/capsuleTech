# Аудит: @capsuletech/cli

- **Путь:** `packages/cli`
- **Версия:** 0.1.1 · **Group:** cli (fixed) · **bin:** `capsule`
- **Роль:** бинарь `capsule` — два режима: TUI (ink, без аргументов, scope-фильтр) + commander (с аргументами, CI). Оба читают один `staticCommands`.
- **Аудит:** 2026-07-07

## Вердикт: 🟡 FIX-BEFORE-MIGRATE

Солидный dual-mode CLI с e2e-smoke и богато задокументированными квирками. 🟡 — из-за функционального CI-gap'а, git-футгана (конфликт с v2-дисциплиной), тонкого unit-покрытия и dangling-ссылки на удалённый пакет.

## Что хорошо

- **Dual-mode** TUI/commander из одного источника команд; продуманный process-exit (SIGINT/SIGTERM → exit(0) пока Vite держит event loop; execa cleanup:true против orphan'ов).
- **e2e smoke** (`e2e/smoke.mjs`, self-contained) — create-workspace + dev-сценарий; prod-условия первого пользователя.
- **remote-sync** (ADR 060 D4) — атомарный vendoring контракта (4 файла в память до первой записи, 404/недоступность throw до mkdir), покрыт тестами.
- Множество квирков задокументировано с корнем (ink vs clack stdin raw-mode, emoji RGI presentation, jiti-кэш, template `__dot__`/`<%= cap %>` workspace-detect).

## Фиксы до/при переносе

| # | Находка | Тяжесть | Действие |
|---|---|---|---|
| CLI1 | **CI-bypass gap (roadmap HIGH):** 15+ команд с `kit.confirm`/`kit.select` **зависают в CI/non-interactive** (нет `isCi()`-гейта перед промптом) — `git commit`, `git pr`, `release local/prod`, `desktop dev/build`, `create *` с обязательными params. | **HIGH** | добавить isCi()-проверку перед каждым промптом → внятный exit вместо hang. CLI = prod-entry пользователя, must-fix для v2. |
| CLI2 | **`gitCommit` action делает `git add -A`** (квирк #16 — «закоммитит всё включая .env»). Прямо конфликтует с v2 git-дисциплиной [[feedback_shared_branch_parallel_agent]] / [[feedback_git_scope_is_package_not_authorship]] («никогда add -A»). Roadmap medium. | med | pathspec-режим или confirm+whitelist до переноса. Футган в чистой земле недопустим. |
| CLI3 | **Тонкое unit-покрытие** — только `runner.test` (isCi) + `remote-sync.test`. Actions (create-app/dev/build/deploy/git/nx) не покрыты; e2e-smoke = только create-workspace+dev. | med | добавить unit на ключевые actions + расширить smoke (build, create-app, layer-gen). Эталон-гейт = тесты. |
| CLI4 | **`@ts-expect-error` в `src/cli/defines.ts`** (2 шт) — присваивание `globalThis.defineCapsuleConfig`/`defineAppConfig` без объявленного типа (identity-стабы Vite-time глобалов). | low | заменить на `declare global { var defineCapsuleConfig … }` — типизировать вместо suppress. |
| CLI5 | **Зависит на `@capsuletech/desktop` (0.0.0 скелет)** — команда `desktop dev/build` завязана на скелет-пакет. desktop в externals (import-time safe), но команда нерабочая, пока desktop не дозреет. | — | судьба команды = судьба desktop-пакета (см. misc-аудит). Возможно отложить desktop-команду из первой волны. |
| CLI6 | Templates не унифицированы (inline `layers.ts` vs файл-дерево app/lib/workspace); `bin/*.mjs` без `checkJs`. | low | косметика, roadmap low — по желанию при переносе. |

## CC-7 (сквозная) — dangling `@capsuletech/shared-file-manager`

CLI OWNERSHIP (release-group, cross-deps) **и web-core OWNERSHIP** ссылаются на `@capsuletech/shared-file-manager`, но в инвентаре `packages/shared/` его **НЕТ** (только `shared-utils` + `shared-zod`; Verdaccio-storage тоже без него). Пакет **инлайнен в CLI** (`src/utils/generateFromTemplates.ts`, квирк #9/#122, коммит `7f44f27`) и, судя по всему, удалён — но ссылки остались в:
- CLI `Release group` (перечисляет 5 членов, включая shared-file-manager),
- web-core `Release group` (тоже),
- вероятно в `scripts/release-local.mjs` group-конфиге (shared infra — проверить).

**Действие:** проверить по всему репо (`grep shared-file-manager`) — вычистить dangling-ссылки при переносе (не тащить в v2 упоминания несуществующего пакета). Занесено в CC-таблицу README.

## Известные квирки (переносятся как знание)

- TUI vs commander dispatch по наличию positional/флага (`capsule --version` ок, `-v` нет).
- `CAPSULE_CI=1`/`CI=true` → non-interactive; `CAPSULE_MODE` override авто-детекта.
- Промпты — ink (`src/kit/prompts.tsx`), НЕ clack (stdin raw-mode конфликт).
- `getViteEntry` требует собранный `vite-builder/dist` в dev.
- Workspace-internal apps зовут локальный бинарь `node ../../packages/cli/bin/capsule.mjs` (dev-quirk, намеренно — [[project_global_cli_stale]]).
