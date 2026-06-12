---
title: brief — owner-cli — agent interface
audience: owner-cli
status: canon
created: 2026-06-11
---

# Brief — owner-cli — Agent interface + minimal plan management

## Цель

Расширить `@capsuletech/cli` командами для **agent-management** и **минимального управления rework-планом**. CLI становится единым диспетчерским pultом для USER'а: «что у нас за фазы, какие агенты есть, что в работе, какой brief дёрнуть».

**Принцип:** максимальное переиспользование уже существующих капсул-либ. CLI — Node-based ink TUI, но мы достаём `@capsuletech/shared-zod` для валидации, `@capsuletech/shared-file-manager` для template-генерации, XState через `@capsuletech/web-state` паттерн (или прямой xstate если Solid-зависимости тянуть нецелесообразно). Думай как build'еру, а не как изобретателю.

## READ FIRST

- `docs/_meta/owner-agent-canon.md` — общие правила (workflow, git-scope, namespace discipline).
- `docs/_meta/cli.md` — AI-anchor CLI (layout, Command contract, gotchas).
- `docs/_meta/web-rework-plan.md` — реальный live plan (твой CLI должен его уметь читать).
- `docs/01-architecture/adr/047-frontend-architecture-zones-cycle-vendor.md` D5 (colocation) + namespace discipline в canon.

## Контекст

USER дирижирует распределёнными owner-агентами в нескольких сессиях Claude Code. Сейчас:
- Plan живёт в `docs/_meta/web-rework-plan.md` (markdown, читается глазами).
- Briefs живут в `docs/_meta/briefs/*.md` (этот файл — пример).
- Agent registry в `.claude/agents/owner-*.md` (читается Claude'ом, не CLI).

USER нужно CLI для:
- Быстрого **обзора plan-status** (какая phase active, какие step'ы BLOCKED / PENDING / IN_PROGRESS / DONE).
- **List агентов** доступных в проекте (читать `.claude/agents/*.md` frontmatter).
- **Dispatch brief**: распечатать brief из `docs/_meta/briefs/<name>.md` в clipboard или в файл-buffer, чтобы paste в новую сессию агента.
- **Создать новый brief** по шаблону (`capsule brief new <agent> <task>` → пустой template в `docs/_meta/briefs/`).
- **Audit-проверки**: `capsule audit ownership` (пакеты без OWNERSHIP.md или с invalid frontmatter), `capsule audit zones` (per ADR 047 D1 нарушения — пакет не в правильной zone-директории).
- В перспективе — **dashboard** через `@capsuletech/web-ui` (отдельный subpath / sub-команда `capsule panel`, поднимает локальный Solid app на localhost'е, отображает то же что и TUI, но визуально). Это **stretch goal**, не обязательно в этой PR.

## Scope

### Команды (новые, в `capsule` namespace)

```
capsule plan               # текущий status (фазы + steps)
capsule plan show <phase>  # подробности фазы (B / C / D / E / ...)
capsule plan next          # что можно стартануть прямо сейчас (BLOCKED→PENDING transitions)

capsule agents list        # все .claude/agents/*.md с frontmatter summary
capsule agents show <name> # detail одного агента
capsule agents check       # validate агентов (frontmatter + READ FIRST ссылка валидна)

capsule brief list         # все docs/_meta/briefs/*.md
capsule brief show <name>  # печать в stdout (для pipe в pbcopy/xclip)
capsule brief copy <name>  # копирует в clipboard (cross-platform)
capsule brief new <agent> <task-id>  # template новой brief'и → docs/_meta/briefs/<agent>-<task-id>.md

capsule audit ownership    # ownership canon check (как scripts/check-ownership.mjs, но через cli)
capsule audit zones        # zone-canon check (per ADR 047 D1) — пакеты в правильных директориях
capsule audit vendors      # vendor-stack section presence в OWNERSHIP (ADR 047 D3)
capsule audit cycles       # domain-domain cycles (per ADR 047 D2) — через madge или similar
capsule audit all          # все audit'ы (для CI)

# Stretch (опц., если успеваешь):
capsule panel              # localhost:5174 (или подобное) с Solid dashboard
                           # потребляет те же данные через REST/WS из cli-server
                           # дog-fooding @capsuletech/web-ui + web-state + web-router
```

### Архитектура команд

- Каждая команда — отдельный файл в `packages/cli/src/commands/<verb>/<noun>.ts` (например `commands/plan/show.ts`).
- Контракт `Command` (уже есть в cli) — action-handler + scope + zod-schema args через `@capsuletech/shared-zod`.
- Parsing CLI args — через commander (current). Auto-detect cwd → ctx.name (current).
- Output:
  - **Default** — ink TUI (Renderable component) с цветной table.
  - **`--json`** flag — JSON для машинной обработки (CI, scripting).
  - **`--quiet`** flag — minimum output.

### Внутренние API (переиспользуемые)

Выноси reusable куски в `packages/cli/src/lib/`:
- `lib/plan/parser.ts` — парсит `docs/_meta/web-rework-plan.md` → typed plan structure (Phase tree + step status). Используй `unified` + `remark` (как в ADR 048 E1 docs:build).
- `lib/agents/registry.ts` — сканирует `.claude/agents/*.md` → `Agent[]`. Frontmatter через gray-matter или vfile.
- `lib/briefs/loader.ts` — `docs/_meta/briefs/*.md` → `Brief[]`. Та же стратегия.
- `lib/audit/*.ts` — каждая audit-rule отдельный файл, `runAudit(rules: AuditRule[])`.

**Перспектива:** этот `lib/plan/parser.ts` будет переиспользован в ADR 048 E1 (docs:build extract pipeline). НЕ ВШИВАЙ в команды plan — сделай shared lib. Если pipeline E1 окажется тяжелее → переедет в `@capsuletech/shared-docs` пакет (третий вызов rule per canon).

### Использование наших либ — где и как

| Lib | Где | Зачем |
|---|---|---|
| `@capsuletech/shared-zod` | Все args validation | Single source of truth для type-shape |
| `@capsuletech/shared-file-manager` | `brief new` template generation | Reuse generateFromTemplates |
| `@capsuletech/shared-utils` | helpers | Не дублировать |
| `xstate` напрямую | CLI command state machine (если нужен) | Не тянуть Solid через `@capsuletech/web-state` |
| `@capsuletech/web-ui` + `web-state` + `web-router` | `capsule panel` (stretch) | Solid app, dogfood |

Где **НЕ переиспользовать**:
- `@capsuletech/web-core` wrappers (HCA) — не подходят для CLI.
- `@capsuletech/web-style` — Tailwind, не работает в Node.
- `@capsuletech/web-renderer` — не нужно.

## Stretch — `capsule panel` (Solid dashboard)

Если успеваешь:
1. `capsule panel` запускает локальный HTTP сервер (например через `hono` или Node-built-in).
2. Сервер отдаёт минимальный Solid SPA, собранный через нашу же vite-builder.
3. SPA использует `@capsuletech/web-ui` (Card, Table, Button, Toggle), `@capsuletech/web-state` для state, `@capsuletech/web-router` для navigation между разделами (Plan / Agents / Briefs / Audit).
4. Данные тянутся через REST/WS из этого же server'а (тот же parser/registry/loader code).
5. **Dogfooding** — мы используем capsule для строительства tooling capsule. Это лучшее validation нашего собственного фреймворка.

Если в эту PR не успеваешь — оставь roadmap stub в OWNERSHIP.md / cli AI-anchor → отдельная PR следом.

## Test plan

- Unit tests для `lib/plan/parser.ts` — corner cases markdown (empty, broken frontmatter, mixed status).
- Unit tests для `lib/agents/registry.ts` — registry walk.
- E2E через `packages/cli/e2e/smoke.mjs` — расширить если нужно.
- Smoke: открыть `capsule plan` руками после build → видишь корректную table.

## Scope ограничения

- **НЕ ломай** существующие `capsule init/create/page/widget/...` команды.
- **НЕ меняй** publicApi `Command` контракта без согласования с главным.
- **НЕ трогай** `release-local.mjs`, root `package.json`, `tsconfig.base.json`.
- Если для `capsule panel` потребуется добавить web-* deps в `@capsuletech/cli` — **обсуди с USER'ом перед добавлением** (большая инфра-decision, dep-implications).

## Git scope при PR

USER может дописывать в playground / docs / другие места параллельно. Joint-work rule per canon: при finalize PR'е забери в commit **всё что относится к scope этой задачи** (твой cli code + USER'ские правки если он сказал «возьми с собой»). Spar/раздельные WIP — оставь.

## Deliverable

PR `feat(cli): agent management + plan inspection + audit suite (+ panel stretch)` — branch `feat/cli-agent-interface`. CI all-green. Описание в PR body — список команд, what was reused vs new, what stretch was/wasn't done.

Когда готов → reportишь USER'у. USER передаёт главному → главный verify + plan-doc update + next step.
