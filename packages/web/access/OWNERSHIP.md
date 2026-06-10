---
name: "@capsuletech/web-access"
owner-agent: главный (стюард — сквозная gate-ось/архитектура, без отдельного owner)
group: web_base (планируется; пока standalone git-tag)
status: SKELETON (0.0.0)
last-updated: 2026-06-09
---

# @capsuletech/web-access

Единая **gate-ось** capsule. Authn + RBAC + entitlements + feature-toggle/inject — НЕ четыре механизма, а ОДИН.

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
