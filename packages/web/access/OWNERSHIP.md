---
name: "@capsuletech/web-access"
owner-agent: главный (стюардит главный assistant — сквозная gate-ось/архитектура)
group: web_base
zone: runtime
status: scaffold
priority: P2
last-updated: 2026-06-11
---

# @capsuletech/web-access

Единая **gate-ось** capsule. Authn + RBAC + entitlements + feature-toggle/inject — НЕ четыре механизма, а ОДИН.

## Состояние (читать ПЕРВЫМ)

- **Zone:** `runtime` — единая gate-ось.
- **Status:** `scaffold` (0.0.0) — структура задана, реализация TBD.
- **Priority:** **P2** — нужен только для apps с правами/feature-toggle.
- **Maturity bar (до alpha):**
  - `can(capability)` resolver.
  - Capability-tagging API (на route / widget / button).
  - Enforcement hooks.
  - **🚨 Резолвить runtime → domain дрейф** — текущий `package.json` содержит dep на `@capsuletech/web-auth` (domain). Per ADR 047 D2, runtime НЕ зависит на domain. Контракт `IAuthCapability` должен переехать в `web-contract`, web-access потребляет контракт; конкретный web-auth реализует через ADR 033 manifest.
- **Active blockers:** runtime → domain дрейф (см. выше). Phase D2 закроет (cross-domain contract setup).
- **Roadmap:**
  1. Phase D2 — extract `IAuthCapability` в `web-contract`; убрать прямую зависимость на `web-auth`.
  2. `can(capability)` resolver MVP.
  3. Capability-tagging API.
- **Last activity:** 2026-06-11 (canon refresh; зафиксирован дрейф).

## Vendor stack (ADR 047 D3)

- **Solid.js** (`solid-js` `^1.9.12`, peerDep) — реактивный фреймворк. https://docs.solidjs.com/
- **`@capsuletech/web-core`** (workspace, dep) — HCA-integration.
- ⚠️ **`@capsuletech/web-auth`** (workspace, dep) — **WRONG DIRECTION** (runtime → domain), будет переписан на контракт в `web-contract` в Phase D2 per [[047-frontend-architecture-zones-cycle-vendor|ADR 047]] D2.

## Ментальная модель

`capability` (тег на цели: фиче/роуте/пункте/кнопке) → резолвер `can(cap)` → enforcement. **Пермишн — свойство назначения, не ветка в коде.**

## Источники (провайдеры), один резолвер

| Провайдер | Источник | Грант |
|---|---|---|
| 🔑 authn (база) | `useAuth()` залогинен? | precondition: нет → login-redirect; даёт роль |
| 🧑‍💼 role (RBAC) | `useAuth().role` | `cap ∈ policy[role]` (policy = app `access.json`) |
| 🏷️ entitlement | `tenant.entitlements` | `cap ∈ entitlements` |
| 🚩 flag (позже) | env/AB/beta | `cap ∈ enabledFlags` |

Слияние дефолт `all` (роль И tenant), `any` конфигурируемо.

## Enforcement-точки

build-inject (forge) · route-guard (`Page.meta { auth, can }`) · nav-filter (фильтр данных) · element (`meta.can` → disabled/render-null).

## API (черновик)

`registerAccessProvider(...)` · `usePermissions()` (`can(cap): boolean`, реактивно) · `<Can cap="...">`.

## Границы

- **Стюард — главный** (сквозная архитектура, как web-contract). Без отдельного owner-агента.
- Consume `web-auth` (`useAuth().role`); policy остаётся в АППЕ (`access.json`). web-auth не знает про app-права.
- Route-guard живёт в **web-router** (читает `Page.meta` → спрашивает резолвер); web-access = мозг, не роутер.
- ⚠️ Унификация: ручной `Features.App` guest/authed гард сливается в этот один guard — рефактор **staged, с ОК юзера**.

## Старт (срез «ограничить роутинг»)

A0 (резолвер + role-провайдер + access.json-схема) + A2 (nav-filter) + A3 (unified route-guard). v1 single-tenant; entitlement/flag/build-inject — позже без переделок (валюта зафиксирована).

## Документация

- Спека: `docs/playground/access.md`
