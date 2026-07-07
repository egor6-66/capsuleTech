# Аудит: runtime zone (14 пакетов)

- **Путь:** `packages/web/runtime/*`
- **Аудит:** 2026-07-07
- **web-core** — отдельный файл [web-core.md](web-core.md) (🟡). Здесь остальные 13.

Триаж (версия/status/src/test): backbone здоров, «спорное» = 0.0.0-alpha/scaffold.

## Зрелый backbone (stable/beta) — переносим

### @capsuletech/web-state (0.1.1, stable) — 🟢 READY
XState-обвязка: `createState` (GOTO-injection) + `createBridge` (pick/omit/match/matchEntry) + tag-registry (alias expansion `@inputs`). 4 test / 5 src — плотно. Sweep чист. Ядро HCA-логики (web-core расширяет `IBaseStateSchema` отсюда — направление зависимости не инвертировать). **Фиксы:** бренд-rename; AI-anchor.

### @capsuletech/web-router (0.1.1, stable) — 🟢 READY
Context-based обёртка над `@tanstack/solid-router` (ADR 003): `createRouter` + `useRouter` + `ICapsuleRouter`. **10 test / 8 src — лучший test-ratio зоны.** Один `biome-ignore noBannedTypes` в types.ts — **аннотирован** (empty-object default для structural intersection, TanStack guard typing). **Фиксы:** бренд-rename; AI-anchor. Раскрыть `current()` под search/hash + typed routeTree augmentation — v2-roadmap (не блокер).

### @capsuletech/web-query (0.1.1, stable) — 🟢 READY
Декларативный API-слой: `defineEndpoint` + koa-style middleware + typed error hierarchy + `setApiClient`/`getApiClient` + `preRequest` hook + subpath `/app-config`. **13 test / 15 src — плотно.** `middleware/user.ts` console.log — **dev-logger middleware** (намеренный, не stray; проверить, что gated by dev-flag). SSE-parser console.log — в doc-комментарии-примере. **Фиксы:** бренд-rename; AI-anchor; подтвердить dev-gate у user-logger.

### @capsuletech/web-style (0.1.1, stable) — 🟢 READY
Styling-слой: `createStyle` (CVA-обёртка) + cn/merge + реестр тем (CSS в `/themes`) + ThemeSwitcher/ThemeEditor (subpath `/editor`) + STATUS_VARIABLES + subpaths `/css` `/themes` (сырой CSS). 8 test / 12 src. Token set FROZEN ([[feedback_token_set_frozen]], ADR 042). **Фиксы:** бренд-rename; AI-anchor. **v2-заметка:** темы + Figma-sync ([[project_figma_design_system_bridge]]) — держать max-compat с Tailwind/shadcn каноном.

### @capsuletech/web-dnd (0.1.1, stable) — 🟢 READY
Pointer-based DnD для Solid (без HTML5 native flicker, mouse+touch единым): DnDProvider + createDraggable/Droppable/Sortable + DragOverlay + useDnD. 7 test / 17 src. Sweep чист. Потребляется boost-layout (Matrix swap) + web-remote. **Фиксы:** бренд-rename; AI-anchor.

### @capsuletech/web-profiler (0.1.1, beta) — 🟡 FIX-BEFORE-MIGRATE (v2 observability-хребет!)
**Критичен для v2:** «трейсы эталон-гейта = наши perf-логгеры» ([[feedback_traces_are_profiler_loggers]], observability first-class). Collector-pattern: тонкий `ProfilerProvider` (шина+trace-sink+контекст) + 13 collectors + reporters + ProfilerDashboard (`/widget`) opt-in children. **«Первый эталон канона тонких провайдеров» (ADR 063)** — де-баррелизован, эталон-инвариант `/providers` тянет только шину (проверяемо по dist-чанку). 49 test cases. No active blockers.
**🟡 причина:** status `beta` — maturity-bar до stable не закрыт (custom collector API не заморожен, reporter middleware-pipeline batching/debounce не сделан). Test=7 файлов на src=48 — покрытие тонковато для surface. **Действие:** заморозить custom-metric API + reporter pipeline → поднять до stable ДО того как v2 объявит observability эталоном. AI-anchor. Приоритет выше обычного P2 — это гейт-инфраструктура v2.

### @capsuletech/web-renderer (0.1.1, beta) — 🟡 FIX-BEFORE-MIGRATE
Runtime рендера UI по JSON-схеме (ISchema дерево + Registry по dot-path). «Обобщённый Widget», stateless, без deps на zod/manifests. RenderMode controlled/static/**full (не реализован)**. 2 test / 5 src — тонко. `resolve.test` @ts-expect-error — негативный type-тест (ок). [[project_renderer_convergence]] — цель: main UI через схемы web-renderer; gap = value-binding. **Действие:** доработать value-binding + `full` FSM-режим (или явно отложить); расширить тесты; AI-anchor. v2: ключевой для studio/renderer-конвергенции.

## Незрелые (0.0.0 alpha / scaffold) — 🟠 UNDER-QUESTION (по POLICY не тащим as-is)

### @capsuletech/web-remote (0.0.0, alpha) — 🟠
Module Federation alternative (свой runtime, postMessage, iframe-src app-mode ADR 059). Substantial+tested (8 test / 11 src) — IframeTransport + RemoteProvider + useRemote landed. **Открытые блокеры:** (1) browser-verify iframe-src app-mode не сделан (real browser, owner-tests); (2) DnD-through-iframe ADR (architect zone) блокирует renderer-as-remote. Codegen-интеграция (vite-builder remotes.ts) «готова, но Provider её не потребляет — берёт `modules` пропом». **Не доказан end-to-end.** v2-развилка: moderator-встройка зависит от remote ([[project_current_checkpoint]] NEXT#1) — но пакет не готов. Решить: в первую волну (закрыв блокеры) или отложить, moderator стартует standalone.

### @capsuletech/web-access (0.0.0, scaffold) — 🟠 / кандидат 🔴
Единая gate-ось (authn+RBAC+entitlements+feature-toggle = ОДИН механизм). Стюард — architect. **Структура задана, реализация TBD; 0 тестов.** Sink вшит в web-core (`registerAccessResolver` + Shape/UiProxy enforcement points готовы), но сам источник (`can()` resolver, capability-tagging) — не построен. Runtime→domain дрейф закрыт (потребляет web-contract, не web-auth). **Действие:** это scaffold — в v2 строить свежим когда понадобится RBAC (ментальная модель хорошая, кода нет). web-core-sink переносится как есть (он готов принять резолвер).

### @capsuletech/web-contract (0.0.0, alpha) — 🟠
Leaf-протоколы для cross-domain capabilities (ADR 047 D2 — домены общаются через контракт, не прямой импорт). `/capabilities` subpath (`IAuthCapability` — потребляется web-access). 9 src / 1 test. Контракт-пакет (типы) — 0.0.0 для него менее тревожно. **Действие:** проверить полноту протоколов + покрытие; это фундамент cross-domain канона (compliance это enforce'ит), в v2 важен. AI-anchor.

### @capsuletech/data-gen (0.0.0, alpha) — 🟡 (НЕ дубль — code-verified)
**Процедурная генерация UI-деревьев** (`@capsuletech/data-gen`, no web- prefix — намеренно, `NO_PREFIX_PKG_DIRS`). 11 src / 3 test. `types.ts` biome-ignore noExplicitAny — аннотирован. Экспорт: `generate`/`fuzzProps` (engine+fuzzer) → `IEditorNode`/`IEditorTree` из манифестов + presets (button/card/form/layout/typography) + seeded `rng` + `wordbank` (sample-тексты). **Второй проход code-verified: НЕ дубль shared-zod/gen** — то генерит ДАННЫЕ по zod-схеме (faker, API-моки), это генерит UI-НОДЫ (процедурный UI для studio-генераторов `/generators`). Разные домены. **Действие:** верифицировать зрелость + связь со studio (studio потребляет data-gen для procedural UI); бренд-rename; поднять версию если зрело. Малый риск.

### @capsuletech/web-date (0.1.0, alpha) — 🟡
Малый date-util (5 src / 2 test), версионирован (не 0.0.0). Sweep чист. **Действие:** проверить полноту API + тесты; бренд-rename; AI-anchor (или свернуть в общий util-doc). Малый риск.

### @capsuletech/web-intl (0.1.0, alpha) — 🟡
i18n-provider (в BaseProviders web-core). 7 src / 3 test, версионирован. Sweep чист. **Действие:** проверить покрытие locale-загрузки; бренд-rename; AI-anchor. Малый риск.

## Pass-2 code-verify (2026-07-08) — касты бэкбона + резолв открытых вопросов

Sweep по `as any`/`as unknown` в **не-тестовом** src (pass-1 сказал «sweep чист» — уточняю):
- **web-state** `create.ts:66,73` — `data: (schema.context ?? {}) as any` + `states: Object.fromEntries(...) as any`. Type-shaping на границе XState-фабрики (`createMachine` generic-context в XState v5 не удовлетворить обобщённо). Framework-internal, НЕ app-facing. **Low-risk, но НЕ аннотированы** → v2: дописать `// Why:`.
- **web-router** `service.ts:44` — `opts.beforeLoad as any` (инъекция guard в routeTree). + аннотированный biome-ignore в `types.ts` (structural intersection, TanStack). Low-risk.
- **web-dnd** `sortable.ts:35` — `(d as any).__sortable` (duck-type маркера drag-payload). Low-risk.
- **web-renderer** `renderer.tsx` — плотные `as any` вокруг `createComponent` (динамический dispatch по dot-path). **Природа обобщённого schema-рендерера** (не гниль); тест 2/5 тонок (уже флагнуто).
- **Резолв:** касты ЕСТЬ, но все — type-shaping на framework-internal границах, **ноль silent-swallow, ноль HACK**. Вердикты 🟢 держатся. Правка «sweep чист» → «касты low-risk, часть без аннотаций».

**Разрешённые открытые вопросы:**
- **web-query `log()` middleware** (`user.ts:97`, был «подтвердить dev-gate») — **это opt-in middleware-фабрика**: console.log только если потребитель ЯВНО добавил `log()` в цепочку. Не stray, не флаг-гейт (композиция чище флага, [[feedback_compose_and_inject]]). **НЕ крутыль.** Снят.
- **web-remote** `RemoteComponent.tsx:323` — реальный **открытый TODO** `ADR 059 open question #1: cross-origin sandbox hardening`. v2 security-follow-up (уже 🟠 по другим блокерам — этот в тот же список).
- **web-profiler** console.log — в `reporters/{trace,console}.ts` = намеренный вывод reporter'а (не hot-path). Ок.

## Итог по зоне

| Пакет | Вердикт |
|---|---|
| web-state / web-router / web-query / web-style / web-dnd | 🟢 (бренд + anchor) |
| web-profiler | 🟡 — заморозить API → stable (v2 observability-хребет, приоритет) |
| web-renderer | 🟡 — value-binding + full-mode + тесты |
| web-remote | 🟠 — открытые блокеры, не доказан e2e (moderator-встройка ждёт) |
| web-contract | 🟠 — контракт-фундамент, проверить полноту |
| data-gen | 🟡 — процедурный UI-gen (НЕ дубль shared-zod/gen, code-verified) |
| web-date / web-intl | 🟡 — малые, проверить покрытие |
| web-access | 🟠/🔴 — scaffold без реализации; строить свежим в v2 (sink в web-core готов) |

**Флажок user'у:** web-remote — в первую волну (закрываем iframe browser-verify + DnD-through-iframe ADR) или откладываем (moderator стартует standalone)? Это определяет объём первой волны.
