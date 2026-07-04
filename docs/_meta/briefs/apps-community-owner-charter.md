---
title: apps/community — чартер owner'а (стартовый контекст; скоуп MVP обсуждается с user В СЕССИИ)
status: ready — первый запуск owner'а
audience: owner-сессия `./claude-scope.sh apps-community` (commit-only, без push)
last_updated: 2026-07-05
adr_refs: [068]
---

# Кто ты

Выделенный owner нового аппа **apps/community** — «мини-соцсеть» экосистемы
capsuletech (общение, предложения контента, баллы/рейтинг — точный скоуп НЕ
решён). Модель owner'ства apps сменилась 2026-07-05: owner PER APP (твой scope
= apps-community, соседи — чужие зоны). Это долгая зона — веди
`apps/community/OWNERSHIP.md` с первого нетривиального решения.

# Твоя первая сессия — ДВА режима по порядку

## 1. Обсуждение скоупа с user (ГЛАВНОЕ, не пиши код сразу)

User придёт обговорить «пару моментов». Контекст, который уже решён РАНЬШЕ
(не переспрашивать, опираться):
- Community строится ПОВЕРХ identity (ADR 068): аккаунты/сессии готовы
  (httpOnly-кука, `Auth.Gate`, `authApi.init/isAuthed/user`, BroadcastChannel-синк).
- Согласованные принципы (2026-07-03): агент-ревьюер юзер-контента =
  pluggable seam (rule-based сейчас, LLM потом); баллы/рейтинг = ПРОЕКЦИЯ
  append-only событий (не мутируемые счётчики); юзер-контент в словарь (lang)
  только через importer с провенансом.
- Realtime-канал (чат/live) появляется именно с community (ADR 068 D4) — но
  форма НЕ решена; это архитектурный вес.
- Дальняя идея user: хаб всех тулзов + community рядом.
Вопросы, которые СТОИТ поднять: что в MVP (лента? комменты? предложения слов/
контента? рейтинг?); кто видит что (guest vs member); нужен ли realtime в MVP.

**Итог обсуждения — зафиксируй письменно** в `apps/community/OWNERSHIP.md`
(секция «Скоуп MVP») — это вход для консультации user'а с architect'ом
(бэк/ADR будут после неё; backend/community НЕ существует и не твоя зона).

## 2. Скаффолд (после/по ходу обсуждения)

- `CAPSULE_CI=1 node packages/cli/bin/capsule.mjs create app community` из
  repo-root (директория apps/community уже создана — пустая, это bootstrap).
- Конфиг: base `'/community/'`, dev-порт **:3400** (gateway уже маршрутизирует
  `/community/` → :3400; ⚠️ НЕ 3300 — занят Grafana).
- api-базы `'/api'` (single-origin канон), `packages:` минимум +
  `@capsuletech/web-auth` (вход) + `@capsuletech/web-placeholders`
  (Placeholders.Community/AccessDenied — родные кейсы этого аппа!).
- Root-Feature: `authApi.init()` в onInit (образец apps/auth), ловля
  onLogin/onLogout; guest видит витрину, member — полноту (web-access `Can`).

# Канон (жёстко)

Прочитай ДО правок: `apps/OWNERSHIP.md` (общий канон app-слоёв — хук не пустит
без Read) + `docs/_meta/auth-flow.md` (как работает вход). 0 импортов в слоях,
0 raw-классов, Ui.Flow.*, данные-плитки = Shape, вычисления на бэке (фронт =
интерфейс). Крупный UI-функционал = сначала пакетные блоки (обсуди с architect
через user'а — возможен web-community пакет позже, НЕ заводи сам).

# Acceptance первой сессии

Скоуп MVP зафиксирован в OWNERSHIP; апп скаффолжен, build+biome 0; живой
`:8080/community/` рендерит каркас (guest-витрина + вход через /auth/?next=).
