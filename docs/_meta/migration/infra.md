# Аудит: infra zone (scripts / root-config / CI / docker / harness)

- **Аудит:** 2026-07-08 (pass-1)
- **Природа:** инфра/тулинг — в v2 **в основном РЕГЕНЕРИРУЕТСЯ/АДАПТИРУЕТСЯ**, не портируется
  verbatim. Оракульная инфра = источник, из которого выводим v2-форму (per-repo, `@omnifield`).

## scripts/ (8) — build/release тулинг

`release-local.mjs` (локальный publish обеих групп `cli`+`web_base`, Verdaccio purge, без
`-dev` суффиксов) · `release.mjs` · `build-packages.mjs` · `audit-exports.mjs` (publint+attw,
бар bundler-✅) · `check-ownership.mjs` (OWNERSHIP-гейт) · `compliance-inventory.mjs` ·
`deploy-preview.mjs` · `feature-report.mjs`.
**Миграция:** release-pipeline переосмыслить под v2 — `@omnifield/*` scope, per-repo (framework
монорепо co-release; продукты свои), новый registry. Логика (fixed-versioning, group publish,
Verdaccio) переносима, но конфиг групп меняется. audit-exports/check-ownership/compliance-inventory
— полезные гейты, адаптировать. **NB:** release-local.mjs **НЕ** ссылается на dangling
shared-file-manager (читает группы иначе) — в отличие от CI (см. CC-7 ниже).

## Root-config (6)

- `nx.json` — `defaultBase: main` ✅ (фикс подтверждён). Nx 22 (dependabot тянет 23 — PR #441 и др.).
- `tsconfig.base.json` — **единственная точка** алиасов `@capsuletech/*` (vite-builder + tsc читают
  её). **CC-1 hotspot:** тотальный rename `@capsuletech`→`@omnifield` (paths + все импорты). Codemod.
- `package.json` (workspace root), `pnpm-workspace.yaml`, `tsconfig.json` (references — cli/router/
  state/compliance добавлены, фикс подтверждён), `biome.json`.
- **Грабля (checkpoint):** root `biome.json` исключает dist/.capsule/node_modules, но **НЕ**
  `.venv`/`.tanstack` → локальный корневой `pnpm lint` ловит 6257 vs CI 1463. v2: добавить
  `.venv`/`.tanstack` в biome-ignore, чтобы корневой прогон = CI.

## CI (.github/workflows, 3)

- `ci.yml` — Lint + Typecheck + Test + Build + compliance:check + **Python tests** (backend-learn
  test:py/lint:py). **CC-7: ссылается на dangling `shared-file-manager`** — CI пытается
  тестить/билдить несуществующий пакет. **Actionable:** не тащить ref в v2 CI.
- `pr-title.yml` — subjectPattern `^[a-z].+$` (conventional). `release.yml`.
**Миграция:** CI переписывается per-repo под v2 (framework монорепо: nx affected; продукты: свои
пайплайны). Матрица бэков (+lang/voice/image/llm/community) переносится.

## docker/ (gateway / observability / preview-server)

- **gateway** — nginx single-origin (ADR 068 D6), path-роутинг на `host.docker.internal:<port>`,
  тупой/stateless. minio (S3, ADR 071/072). **Апы/бэки на ХОСТЕ, не в контейнерах** (важно для
  агент-продуктов — см. `brainer/DEPLOY.md`). Loki host-порт — capsule PR #478.
- **observability** — OTEL collector (:4317) → Prometheus (метрики) + Loki (логи) → Grafana (:3333).
  Мониторит параллельные Claude-сессии по `scope`. **Переиспользуется brainer'ом** (agent-оркестрация
  читает эту телеметрию).
- **preview-server** — Dockerfile + compose (deploy-preview).
**Миграция:** docker = shared local/prod инфра. Repo-map → **`devops/`** репо. gateway+observability
переносятся (реально используются, вкл. brainer). Постура ADR 072 (containerize/S3/env-URL) здоровая.

## Harness (.claude/)

- **Repo-root `.claude/agents/`** — 30+ agent-промптов (owner-*, layer-*). **Tracked, shared.**
- **`docker/observability/.claude/`** — hooks (git-gate, governance, scope-resolve/identity,
  main-session-marker, git-audit, dev-diagnostics) + settings + `.main-session-id`. Сессии стартуют
  из `docker/observability/` (канон CLAUDE.md §0.2).
- **CC-7 harness-часть:** `.claude/agents/owner-{cli,shared,builders}.md` ссылаются на
  shared-file-manager (stale).
**Миграция:** v2 harness = **commons/standards/agents шаблоны** (repo-agnostic) + per-repo `.claude`
(уже делается: writer/brainer подняты по этому паттерну, brand-neutral `OMNIFIELD_SCOPE`). Оракульный
harness — источник для вывода, не verbatim-порт. governance.mjs НЕ портирован в writer/brainer
(осознанное сокращение — см. их CLAUDE.md).

## Тиры

| Артефакт | Вердикт |
|---|---|
| gateway + observability | 🟢 REUSE (живые, brainer их юзает) → devops-репо |
| release/audit/ownership scripts | 🟡 ADAPT (логика переносима, конфиг групп + `@omnifield` меняется) |
| root-config (tsconfig.base/nx/biome/pkg) | 🟡 REGEN + CC-1 rename + biome-ignore фикс |
| CI workflows | 🟡 REWRITE per-repo + **CC-7 cleanup** (не тащить shared-file-manager) |
| harness (.claude) | 🟢 уже деривится в v2 из commons-шаблонов (writer/brainer) |
| preview-server | 🟠 проверить нужность в v2 (deploy-preview флоу) |

## CC-7 статус (подтверждён 2026-07-08)
`shared-file-manager` (удалённый пакет) — **24 файла** всё ещё ссылаются. Живые не-doc:
`ci.yml`, `cli/src/utils/generateFromTemplates.ts` (инлайн-остаток), 5×OWNERSHIP, 3×agent-промпт.
Остальное — doc-drift. **v2:** не переносить ни один ref; при переносе CLI генератор шаблонов
уже инлайнен (пакета нет), CI/группы чистятся.

## Открыто (pass-2)
- release-local.mjs group-конфиг: как читает группы (package.json field? const?) — для v2-адаптации.
- preview-server — живой ли flow, нужен ли.
- Полный список ADR 072 §4 (Dockerfile-присутствие) per backend-сервис.
