# Аудит: @capsuletech/web-core

- **Путь:** `packages/web/runtime/core`
- **Версия:** 0.1.1 · **Zone:** runtime · **Group:** web_base · **Priority:** P0
- **Роль:** сердце HCA — 6 wrapper'ов (View/Widget/Page/Controller/Feature/Shape) + Entity, UiProxy + ControllerProxy, BaseProviders, createRoot, `Ui`-namespace registry.
- **Аудит:** 2026-07-07

## Вердикт: 🟡 FIX-BEFORE-MIGRATE

**Код и тесты — эталонного качества (🟢).** Причина 🟡 — не в коде, а в **доко-гигиене и dependency-hygiene**, которые нужно закрыть при переносе (все пункты мелкие, ни один не архитектурный). По v2-DoD (эталон = код+тесты+**доки**) пакет не дотягивает до эталона до появления AI-anchor.

## Что хорошо (переносим как есть)

- **Публичный API стабилен и богато задокументирован** — вся история breaking-changes (v0.2→v0.4) отражена в OWNERSHIP с ADR-ссылками. Контракт чёткий: 3 основных subpath (`.`/`/create`/`/providers`) + `/events` (лёгкий event-канал для пакетов).
- **Костылей нет.** Единственный каст в src — `as unknown as ICapsuleRouter` (base.tsx:90) — **аннотирован обоснованием** (widening cast, рантайм-форма идентична). Никаких silent fallback / swallow / hardcoded paths.
- **`@ts-nocheck` — ложная тревога:** упоминание в base.tsx:55 описывает генерируемый `routeTree.gen.ts` (он под `@ts-nocheck`), не сам web-core. Реальная зона — codegen роутера (builders/router), учесть при аудите builders.
- **Тестовое покрытие ядра** — ui-proxy (bubble-dedup, meta opt-in, cleanup), controller-proxy (dispatch lookup, next-bubbling, state.set/matches), derivation, shape batch-flow, ui-meta-props. Все зелёные — гейт «characterization-тест первым» соблюдён.
- **Access-resolver injection** (registerAccessResolver / resolveAccess) — additive, no-op без резолвера. Чистая инъекционная модель, канон [[feedback_compose_and_inject]].
- **`useEmitOptional`** — грамотное разведение app-scope (throw) vs package-scope (no-op). ADR 032.

## Фиксы до/во время переноса (все мелкие)

| # | Находка | Действие | Тяжесть |
|---|---|---|---|
| 1 | **Бренд-rename** `@capsuletech/*` → `@omnifield/*` в name + всех workspace-deps | механическая замена по всему пакету (cross-cutting, см. README) | mech |
| 2 | **OWNERSHIP.md — устаревшие внутренние пути:** все ссылки вида `packages/web/core/src/...`, фактический путь `packages/web/**runtime**/core/src/...`. Дрейф после зон-реорга (ADR 047 D7 → runtime/). | обновить пути в OWNERSHIP | doc |
| 3 | **`@capsuletech/vite-builder` в `dependencies`** — в src используется только в **doc-комментарии** (app-config.ts:175). Build-tool в рантайм-deps = лишняя транзитивная установка у потребителей + нарушение dependency-tiers (runtime → build-time). | verify (import в vite.config.mts?) → перенести в `devDependencies` или удалить | dep |
| 4 | **Exports vs docs drift:** package.json экспортит **9** subpath'ов (`.`, `/create`, `/providers`, `/app-config`, `/contract`, `/module`, `/ui-kit`, `/bootstrap`, `/events`), OWNERSHIP «Публичный API» документирует **4**. `app-config`/`contract`/`module`/`ui-kit`/`bootstrap` — реальные файлы (не мёртвые), но недокументированы. | дописать 5 subpath'ов в API-раздел | doc |
| 5 | **Нет AI-anchor** `docs/_meta/web-core.md` — сам roadmap помечает как high-priority-долг. По v2-DoD без доки пакет не эталон. | написать anchor при переносе (docs-writer) | doc |
| 6 | OWNERSHIP говорит «8 workspace deps», package.json содержит **10** (+web-intl, +shared-utils). | поправить число/список | doc |

## Зафиксированные quirk'и (переносятся как канон-знание, НЕ баги)

- `IUiMetaProps` живёт в web-core, не в web-ui (HCA-props перехватываются UiProxy, в DOM не попадают).
- `createRoot` ≠ Solid `createRoot` (render-фабрика).
- CSS удалён из пакета (bootstrap-стили в `.capsule/styles.css` от builders scaffold).
- `EVENT_HANDLERS` — 6 хардкоженных событий (onClick/onInput/onChange/onBlur/onFocus/onKeyDown); расширение = правка ui-proxy + ADR.
- `next(payload)` — прямой вызов `parent.controller[name]`, не XState event-bus (ADR 008, гибридная FSM).
- **NOTE-канон (после 2 инцидентов Image/Prose):** новый manifest-тип в web-ui = в том же цикле wiring здесь (imports.tsx + interfaces.ts + tsconfig path). Guard `manifest-path-invariant` ловит на pre-push. → это архитектурная связка kit↔core, в v2 держать.

## Открытые вопросы для v2 (не блокеры переноса)

- **SSR-готовность** — `createRoot` CSR-only (`document` в hot-path). Roadmap low. В v2 решить: остаётся CSR-first или заводим hydrate-ветку (влияет на контракт `createRoot`).
- **Ui.* injection API consolidation** (`ui-kit/imports.tsx` Phase C2 для Ui.Outlet) — незавершённый рефактор, отметить статус.
- **kit↔core wiring вручную** (manifest-path-invariant) — рабочий, но ручной 3-шаговый цикл на каждый kit-компонент. В v2 подумать про кодген этого wiring'а (убрать ручной шаг). Обсудить, не блокер.
