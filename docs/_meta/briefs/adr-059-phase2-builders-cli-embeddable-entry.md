---
tags: [builders, cli, adr-059, brief, phase-2, owner-builders, owner-cli]
status: blocked-on-brief-1
date: 2026-06-24
zone: owner-builders (+ owner-cli)
adr: 059-web-remote-app-mode-iframe-src-and-config-override
sequence: 2-of-3 (зависит от протокола Brief 1)
related:
  - 059-web-remote-app-mode-iframe-src-and-config-override
  - 013-explicit-define-app-config
---

# Brief 2/3 — builders+cli: self-contained app build + embeddable entry (ADR 059)

> [!warning] BLOCKED на Brief 1 (web-core). Старт только после того, как протокол handshake +
> формат передачи `sessionId`/`name` (URL query/hash vs initial-message) **зафиксирован** в
> [[adr-059-phase1-web-core-handshake-config-override]] и согласован архитектором. Иначе entry
> разойдётся с web-core.

> [!info] Кому: **owner-builders** (scope `vite-builder`), при необходимости CLI-части — координация
> с **owner-cli**. Прочитай `packages/builders/vite/OWNERSHIP.md` + ADR 059.

## Цель

Приложение должно собираться **self-contained** для встраивания и сервить **embeddable-entry**,
который участвует в handshake'е из Brief 1. Никакого externalize'а solid, никакого remote-entry
как тонкого bundle'а.

## Scope

1. **Self-contained сборка для app-режима.** Убрать модель remote-entry, externalize'ящую solid
   (ADR 059 D2). Приложение бандлит свой solid/router — как standalone. Проверить, что
   `optimizeDeps`/`manualChunks` для solid остаются как у обычного app-билда (не external).
2. **Embeddable-entry.** Приложение должно отдавать entry, который при загрузке в iframe:
   - читает `sessionId`/`name` из **query-параметров** `location.search`:
     `?__capsule_session=<id>&__capsule_name=<app>` (контракт Brief 1, хост проставит — Brief 3);
     читать синхронно до первого postMessage; можно вычистить `__capsule_`-параметры из URL после;
   - вызывает embed-aware bootstrap web-core (Brief 1).
   На практике это, вероятно, тот же `createCapsuleApp`-путь, просто корректно прокинутый в
   генерируемый `.capsule`-entry. Уточнить: нужен ли отдельный standalone-route или хватает
   обычного index с embed-detect внутри (Brief 1 §детект).
3. **Wiring `capsule.app.ts` override.** Убедиться, что `defineAppConfig` (ADR 013) корректно
   доступен как **база** для config-override merge (Brief 1). Если генерация registry/entry
   требует прокинуть config-схему в рантайм для фильтра — сделать (фильтр живёт на приёме у app,
   Brief 1).
4. **Манифест (открытый вопрос ADR 059).** Решить с архитектором: нужен ли `capsule.manifest.json`
   в app-режиме вообще (entry = URL приложения, не bundle). Возможно — только метаданные
   (name/version). Не тащить старую `entry`-as-bundle модель.

## Что НЕ трогать

- Протокол сообщений / merge — зона Brief 1 (web-core). Здесь только генерация entry + сборка.
- Host-side iframe — Brief 3 (web-remote).
- `packages/web/runtime/query/*` (defineAppConfig внутренности) — зона owner-web-query, эскалация.

## Тесты / verify

- App собирается self-contained (свой solid в бандле, не external) — проверить output.
- Сгенерённый embeddable-entry читает sessionId/name по протоколу Brief 1 и зовёт embed-bootstrap.
- e2e smoke (`pnpm test:e2e:cli`) не сломан.

## Возврат

`pnpm --filter @capsuletech/vite-builder build` + затронутые тесты green. Вернуть архитектору
diff-summary + как именно entry получает sessionId/name (сверка с Brief 1). НЕ коммить до review.
