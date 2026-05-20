---
title: OWNERSHIP.md Template
status: living
last-updated: 2026-05-20
---

# OWNERSHIP.md — шаблон для owner-agent'ов

Каждый пакет в `packages/<scope>/<name>/` имеет **`OWNERSHIP.md`** в своей директории. Owner-agent перед началом работы **обязан** прочитать этот файл (плюс соответствующий AI-anchor в `docs/_meta/<pkg>.md`).

Это **single source of truth** про то что владеет agent. Не дублируется в agent prompt'е — там только ссылка.

## Структура

```markdown
---
name: @capsuletech/<pkg-name>
owner-agent: owner-<short>
group: <cli|web_base|canvas|other>
status: <pre-1.0|stable|deprecated>
last-updated: <YYYY-MM-DD>
---

# @capsuletech/<pkg-name>

Однопредложение — что делает пакет.

## Зона ответственности

### Owns
- `packages/<scope>/<name>/src/` (полностью)
- `packages/<scope>/<name>/vite.config.mts`
- `packages/<scope>/<name>/package.json` exports / deps
- ...

### Не трогает
- Содержимое других `@capsuletech/*` пакетов (делегировать).
- Root-level `package.json`, `tsconfig.base.json`, `nx.json` (главный assistant).
- `apps/*/` (user / framework-developer scope).
- `scripts/release-local.mjs` и подобные shared infra (главный assistant).

## Публичный API

Перечислить что **экспортируется** через `package.json.exports`:
- `.` — main entrypoint, что внутри.
- `./subpath` — что внутри.

Это **контракт**. Изменение публичного API = breaking change → coordinate с главным.

## Quirks / gotchas

Перечислить **известные** странности (с короткой причиной) которые могут поломать work если agent не знает:
- `<quirk>` — почему так.
- `<workaround>` — что использовали.

## План рефакторинга / оптимизаций

```markdown
- [ ] **<title>** — короткое описание. (priority: high/medium/low)
- [x] **<done>** — что было сделано (with date).
```

## Test coverage

| Тип | Где | Что покрывает |
|---|---|---|
| Unit | `src/__tests__/` | основные API, edge cases |
| Integration | — | если есть |
| E2E | `packages/cli/e2e/smoke.mjs` | косвенно через scenarios |

**Перед изменением:** unit-tests должны быть green (`pnpm --filter <pkg> test`).
**При breaking change:** обновить tests + добавить новые для contract.
**Перед release:** `pnpm test:e2e:cli` обязателен.

## Cross-package dependencies

Если задача касается **другого** пакета — делегировать соответствующему owner'у:

| Зона | Owner |
|---|---|
| CLI templates / commands | owner-cli |
| Vite plugins / lib-builder | owner-builders |
| Theme variables, createStyle | owner-web-style |
| UI primitives, Layout | owner-web-ui |
| HCA wrappers, providers | owner-web-core |
| ... | ... |

## Release group

- `cli` — fixed group: cli + compliance + lib-builder + shared-file-manager + vite-builder
- `web_base` — fixed group: web-core/dnd/editor/profiler/query/remote/renderer/router/state/style/ui + shared-zod
- (others — private / not released)

После изменений в этом пакете — координировать release через главного.
```

## Правила

1. **Один OWNERSHIP.md = один пакет.** Если owner-agent владеет несколькими (`owner-builders` → 4 пакета), у каждого свой файл.
2. **Обновлять `last-updated`** при любом изменении содержимого.
3. **Quirks/gotchas — кратко**, со ссылкой на код (`src/foo.ts:42`). Не дублировать всё README.
4. **План рефакторинга** — checkbox-список. Удалять `[x]` items раз в квартал чтобы не накапливалось.
5. **Cross-package — список не exhaustive**, только релевантные зоны. Default — если не знаешь чей это пакет, спрашиваешь главного.

## Когда писать впервые

После любого нетривиального change в пакете → если `OWNERSHIP.md` нет, создать. Заполнить как минимум **Зону ответственности** + **Quirks** + **Tests**. Остальное по мере накопления.

## Связанные документы

- `CLAUDE.md` — POLICY section, общие правила для всех agents.
- `docs/_meta/<pkg>.md` — AI-anchor doc (углублённый, для архитектурных решений).
- `docs/_meta/dep-management-plan.md` — план dep gigiene.
