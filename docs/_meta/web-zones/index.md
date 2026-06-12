---
title: web-zones-index
description: Index 5 zone canon docs для packages/web/* per ADR 047 D1 + D6. Точка входа для контрибьютора / агента / user'а.
status: canon
last_updated: 2026-06-12
---

# Web zones — index

> Канон-источник: [[047-frontend-architecture-zones-cycle-vendor|ADR 047]] D1. `packages/web/*` разбивается на 5 zone по смыслу. Реализация — физическая через директории `packages/web/<zone>/<pkg>/` (после Phase D миграции).

## 5 zone

| Zone | Packages | Что это | Doc |
|---|---|---|---|
| **kit** | `web-ui` | Stateless light primitives + light композиции. ZERO heavy deps. | [[web-zone-kit]] |
| **runtime** | `web-core`, `web-state`, `web-router`, `web-query`, `web-style`, `web-renderer`, `web-dnd`, `web-intl`, `web-date`, `web-profiler`, `web-remote`, `web-contract`, `web-access` | Framework-сервисы, включённые в каждое capsule-приложение под капотом. | [[web-zone-runtime]] |
| **domain** | `web-auth`, `web-shell`, `web-agent` | Stateful feature-packages — «мини-апп как пакет». | [[web-zone-domain]] |
| **boost** | `boost-table`, `boost-map`, `boost-flow`, `boost-chart`, `boost-layout` | Heavy domain-mirror kit-примитива. Зеркало в `Ui.*`, full power в `Tables.*`/`Maps.*`/etc. | [[web-zone-boost]] |
| **studio** | `studio` (host/composer) | Tooling для авторства capsule-приложений. Composes from other zones. Не в prod-bundle. | [[web-zone-studio]] |

## Канон зависимостей

```
       kit ← runtime
        ↑       ↑
       boost   domain
        ↑       ↑
       (apps консьюмят всё)

       studio ← всё кроме apps
```

Кратко:
- **kit** зависит ТОЛЬКО на runtime/web-style + vendors. Никогда — на boost/domain/studio.
- **runtime** может на runtime (без циклов) + kit.
- **boost** — на runtime + kit. Не на domain / другой boost.
- **domain** — на kit/runtime/boost. **НЕ на другой domain** (canon — через `web-contract`).
- **studio** — host/composer; на всё кроме apps. Один пакет в зоне (single-package by design).

Compliance enforces (расширение [[004-compliance-golden-rules|ADR 004]] на package-уровень).

## Принципы (контекст для всех zone)

Per [[047-frontend-architecture-zones-cycle-vendor|ADR 047]] «Принципы»:

1. **Уникальность — за счёт возможностей, не «своих» практик.** HCA + Proxy + registry + ADR 033/041 — наш уровень. На уровне примитивов/стилей/state — индустриальные стандарты.
2. **Не заставляем юзера учить наши костыли.** Senior FE открывает код → узнаёт Kobalte/CVA/TanStack/XState/Tailwind → работает за 5 минут.
3. **Делаем максимально правильно.** Каждый PR canon-ready для внешнего читателя.
4. **Колокация > копипасты.** Third-call rule: третий вызов → helper. До этого — копия осознанно.
5. **Vendor-transparent.** Wrapper'ы с reason-комментарием. OWNERSHIP «Vendor stack» секция обязательна.

## Per-package OWNERSHIP

Каждый пакет имеет `packages/<scope>/<name>/OWNERSHIP.md` по [[OWNERSHIP-template]]. Обязательные секции (post-#301):

- **Состояние** — zone / status / priority / maturity bar / blockers / roadmap / last activity.
- **Vendor stack** (ADR 047 D3) — главные вендоры + ссылки upstream.
- **(Domain-only) Allowed dependency zones** — явный whitelist (`kit, runtime, boost` + контракты; без других domain).

## Per-package README

Каждый пакет имеет `packages/<scope>/<name>/README.md` по [[readme-template]]: один-line purpose + zone badge + install + minimum usage (5-10 строк) + subpath exports + links. **Open folder → know how to use.**

## Related

- [[047-frontend-architecture-zones-cycle-vendor|ADR 047]] — крыша (zones + cycle canon + vendor transparency + studio rename + D6 zone flatten).
- [[046-boost-namespace-matrix-evict-vt-owner|ADR 046]] — boost-* namespace + Matrix evict.
- [[045-web-taxonomy|ADR 045]] — preceded (partially superseded).
- [[044-web-menu-package|ADR 044]] — heavy=pkg / light=kit principle.
- [[004-compliance-golden-rules|ADR 004]] — compliance, расширяется на пакет-уровень.
- [[web-rework-plan]] — live execution plan фаз rework'а.
- [[owner-agent-canon]] — общий канон owner-* агентов.
