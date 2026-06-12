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
zone: <kit|runtime|domain|boost|studio>
status: <scaffold|alpha|beta|stable|deprecated>
priority: <P0|P1|P2|P3>
last-updated: <YYYY-MM-DD>
---

# @capsuletech/<pkg-name>

Однопредложение — что делает пакет.

## Состояние (читать ПЕРВЫМ)

> ⭐ Эта секция обязательна. Любой контрибьютор / агент / user должен **за 30 секунд** понять «брать этот пакет или нет, в каком он состоянии».

- **Zone:** `<kit|runtime|domain|boost|studio>` (per ADR 047 D1).
- **Status:** `<scaffold|alpha|beta|stable|deprecated>` — реальное состояние, не декларативное.
- **Priority:** `<P0|P1|P2|P3>` — насколько важен в общей картине (P0 = критичный путь, P3 = nice-to-have).
- **Maturity bar:** что нужно чтобы перейти в следующий status (3-5 буллетов).
- **Active blockers:** что мешает прямо сейчас (или «нет»).
- **Roadmap (3-5 пунктов):** ближайшие 2-3 sprint'а / месяца.
- **Last activity:** дата последнего значимого PR.

## Vendor stack (ADR 047 D3)

Обязательная секция — список главных вендоров + одна строка про каждый + upstream-ссылка. Контрибьютор открывает → понимает с чем работает.

- **<vendor>** (`<npm-pkg>` `^<version>`) — назначение. https://upstream-docs/

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

## Связанные документы {#related}

- `CLAUDE.md` — POLICY section, общие правила для всех agents.
- `docs/_meta/<pkg>.md` — AI-anchor doc (углублённый, для архитектурных решений).
- `docs/_meta/dep-management-plan.md` — план dep gigiene.
