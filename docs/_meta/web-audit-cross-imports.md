---
title: web-audit-cross-imports
description: Snapshot cross-package npm-зависимостей `@capsuletech/*` для всех 23 пакетов packages/web/*. Baseline для compliance Phase D3 enforcement (ADR 047 D2 + D1).
status: snapshot
last_updated: 2026-06-11
---

# Cross-import baseline (Phase W5)

> **Источник правды для архитектуры:** [[047-frontend-architecture-zones-cycle-vendor|ADR 047]] D1 (zones) + D2 (no horizontal between domain) + D3 (vendor transparency). Этот документ — **снимок** на момент merge'а Phase W. Phase D3 compliance-rule будет enforce'ить эти ограничения автоматически.

## Метод

Извлечено из `packages/web/<pkg>/package.json` секций `dependencies` + `peerDependencies` — только `@capsuletech/*` записи. Vendor deps (solid-js, kobalte, tanstack, ...) — отдельный slice (см. OWNERSHIP «Vendor stack» per package).

`shared-zod`, `shared-utils`, `vite-builder` — workspace-shared утилиты, не входят в zone-canon (использование везде разрешено, кроме apps в prod).

## Zone canon (per ADR 047 D1)

```
kit:         web-ui
runtime:     web-core, web-state, web-router, web-query, web-style,
             web-renderer, web-dnd, web-intl, web-date, web-profiler,
             web-remote, web-contract, web-access
domain:      web-auth, web-shell, web-agent
boost:       boost-table, boost-map, boost-flow, boost-charts
design-time: web-creator, web-ui-creator
```

**Правила зависимостей:**

```
kit       → runtime/web-style (peer)                    + vendors
runtime   → runtime (no cycles) + kit                   + vendors
boost     → kit + runtime                               + vendors
domain    → kit + runtime + boost  ↛ другой domain      + vendors
design-time → всё кроме apps + другой design-time       + vendors
```

## Snapshot (2026-06-11)

### kit zone

| Package | npm deps | npm peers | Compliance |
|---|---|---|---|
| `@capsuletech/web-ui` | `shared-zod`, `web-contract` | `web-style` | ✅ |

**Анализ:** `web-contract` — runtime (leaf-протокол), `shared-zod` — shared workspace util, `web-style` peer — runtime. Импортов в boost/domain/design-time нет. **Canon compliant.**

### runtime zone

| Package | npm deps | npm peers | Compliance |
|---|---|---|---|
| `@capsuletech/web-core` | `web-profiler`, `web-router`, `web-state`, `web-ui` _(kit)_, `web-query`, `shared-zod`, `shared-utils`, `vite-builder`, `web-style`, `web-intl` | — | ✅ |
| `@capsuletech/web-state` | — | — | ✅ |
| `@capsuletech/web-router` | — | — | ✅ |
| `@capsuletech/web-query` | `shared-zod`, `shared-utils` | — | ✅ |
| `@capsuletech/web-style` | — | — | ✅ |
| `@capsuletech/web-renderer` | — | — | ✅ |
| `@capsuletech/web-dnd` | — | — | ✅ |
| `@capsuletech/web-intl` | — | — | ✅ |
| `@capsuletech/web-date` | — | — | ✅ |
| `@capsuletech/web-profiler` | — | — | ✅ |
| `@capsuletech/web-remote` | — | — | ✅ |
| `@capsuletech/web-contract` | — | — | ✅ |
| `@capsuletech/web-access` | `web-contract`, `web-core` | — | ✅ (drift fixed Phase D2 — `IAuthCapability` через web-contract/capabilities) |

**Анализ:**

✅ **web-core** — единственный runtime-пакет с зависимостью на kit (`web-ui`), что **legitimate** (web-core инжектит `Ui.*` через slot-registry в Page/Widget wrappers). Остальные deps — runtime-runtime, без циклов.

❌ **web-access → web-auth** — **WRONG direction**. Per ADR 047 D2 + canon: runtime НЕ зависит на domain. `web-access` нужно знать `useAuth().role` для resolver'а `can(cap)`, но прямой import создаёт runtime → domain coupling. Чинится в Phase D2: контракт `IAuthCapability` extracted в `web-contract`, `web-access` потребляет контракт, `web-auth` реализует через ADR 033 manifest. Зафиксирован active blocker в `packages/web/access/OWNERSHIP.md` (W2 PR #303).

**Цикл-проверка:** web-core → state/router/query/style/intl/profiler/ui — ни один из этих пакетов НЕ импортит web-core обратно. Цикл нет.

### domain zone

| Package | npm deps | npm peers | Compliance |
|---|---|---|---|
| `@capsuletech/web-auth` | `shared-zod`, `web-core`, `web-query`, `web-state`, `web-ui` | — | ✅ |
| `@capsuletech/web-shell` | `web-core`, `web-dnd`, `web-intl`, `web-style`, `web-ui` | — | ✅ |
| `@capsuletech/web-agent` | `shared-zod`, `web-core`, `web-query`, `web-ui` | — | ✅ |

**Анализ:** Все три domain-пакета зависят ТОЛЬКО на kit + runtime + shared. **Cross-domain imports — NONE.** Compliance ADR 047 D2 — clean. Это значительно: ничего не нужно extract'ить в контракты для текущей domain-функциональности; контракты появятся когда впервые возникнет реальный cross-domain потребитель.

### boost zone

| Package | npm deps | npm peers | Compliance |
|---|---|---|---|
| `@capsuletech/boost-table` | `shared-zod`, `web-contract`, `web-core`, `web-style`, `web-ui` | — | ✅ |
| `@capsuletech/boost-map` | — | `web-core` | ✅ |
| `@capsuletech/boost-flow` | — | `web-style` | ✅ |
| `@capsuletech/boost-charts` | — | `web-style` | ✅ |

**Анализ:** Все boost-пакеты зависят ТОЛЬКО на kit + runtime. Cross-boost imports — NONE. Domain imports — NONE. **Canon compliant.**

**Замечание:** `boost-map/flow/charts` имеют МЕНЬШЕ deps чем `boost-table` — это потому что они scaffold/alpha и пока не полностью integrated с capsule registry/HCA. По мере наполнения скорее всего добавят `web-core` peer как минимум.

### design-time zone

| Package | npm deps | npm peers | Compliance |
|---|---|---|---|
| `@capsuletech/web-creator` | `web-contract`, `web-core`, `web-renderer`, `web-style`, `web-ui` | — | ✅ |
| `@capsuletech/web-ui-creator` | `shared-zod`, `web-core`, `web-dnd`, `web-ui` | `web-renderer` | ✅ |

**Анализ:** Design-time может зависеть на всё кроме apps + другой design-time. Оба пакета зависят на kit + runtime. На domain или boost — нет (пока). **Canon compliant.**

**Замечание:** При финализации Phase D4 (rename `web-creator` → `studio` + absorb ui-creator) deps будут консолидированы в один пакет с subpath'ами.

## Сводка по drifts (что Phase D3 compliance должен ловить)

| # | Drift | Severity | Status |
|---|---|---|---|
| 1 | `@capsuletech/web-access` → `@capsuletech/web-auth` (runtime → domain) | High | ✅ **CLOSED Phase D2** — `IAuthCapability` extract'ed в `web-contract/capabilities`; access потребляет контракт; vite-builder generator wires `useAuth()` arg в `setupAccess`. |

**Total drifts: 0 of 23 packages** (на момент Phase D2 closure). Архитектура полностью canon-compliant. ADR 047 D2 (no horizontal between domain) — 100% clean. ADR 047 D1 (zone dependency direction) — 23/23 clean.

Phase D3 compliance enforcement сейчас не имеет известных нарушений для baseline'а — новые drifts будут пойманы автоматически при добавлении (если правила реализованы).

## Compliance rule mapping (для Phase D3 builder'а)

Phase D3 (compliance расширение per ADR 047 D2/D3) реализует AST-правила в `packages/builders/compliance/`. Mapping:

| Rule | Что проверяет | Severity |
|---|---|---|
| `zone-no-upward` | import-path из package zone N не уходит в zone N+1 (downward направление: kit ← runtime ← {boost,domain}) | error |
| `domain-no-horizontal` | domain-X не импортит domain-Y напрямую (через `@capsuletech/web-contract` — OK) | error |
| `runtime-no-domain` | runtime НЕ импортит domain (web-access → web-auth fix этим закроется) | error |
| `boost-no-cross-boost` | boost-X не импортит boost-Y | warning (no real precedent yet) |
| `boost-no-domain` | boost не импортит domain | error |
| `vendor-wrapper-comment` | capsule-wrapper вокруг известного vendor'а без ADR-комментария | warning |

Allowlist для known-good исключений (типа `web-core → web-ui` для slot-registry):
- `@capsuletech/web-core/src/ui-kit/imports.tsx` импортит из `@capsuletech/web-ui/*` — legitimate Ui.* registry.

## Что НЕ покрыто этим snapshot'ом

- **App-уровневые зависимости** (`apps/*/package.json`) — apps могут импортить всё, это user-zone. Не enforced.
- **Vendor wrappers без ADR-комментария** — D3 будет отдельно ловить.
- **Internal package layer rules** (HCA — Entity/Widget/Page и т.д.) — уже enforced через `@capsuletech/compliance` Vite-плагин на app-уровне.
- **Cycle detection** между runtime-пакетами — сейчас вручную проверено clean. Phase D3 добавит автоматическую проверку.

## Related

- [[047-frontend-architecture-zones-cycle-vendor|ADR 047]] D1 + D2 + D3.
- [[web-zones-index]] + [[web-zone-runtime]] + [[web-zone-domain]] + [[web-zone-boost]] + [[web-zone-kit]] + [[web-zone-design-time]].
- [[web-rework-plan]] → Phase D2 (cross-domain contracts) + Phase D3 (compliance extension).
- `packages/web/access/OWNERSHIP.md` — drift документирован в «Состояние» секции (W2 PR #303).
- [[004-compliance-golden-rules|ADR 004]] — текущий compliance package (intra-app HCA), расширяется на пакет-уровень в D3.
