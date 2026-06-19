---
title: 'Observability & integration-harness plan — переключатель режима Capsule из чёрного ящика'
status: draft
audience: architect + owner-agents
last_updated: 2026-06-19
related:
  - CLAUDE.md POLICY §0 (modules, no crutches)
  - docs/_meta/web-remote.md (paused)
  - feedback_no_hypotheses_diagnose_with_tools
  - feedback_root_cause_before_fix
  - feedback_canon_modules_no_crutches
---

# Контекст

Сессия 2026-06-19 вечером — paused web-remote Phase 1 demo + связанная feature-работа. Триггер — паттерн который копился последние ~10 взаимодействий: «собралось → используем, не собралось → копаем во framework, обходим баг, через час он же выстреливает с другой стороны». Снежный ком багов накопился across фичами (web-remote, ewc, DataTable virtual-scroll, Dropdown first-open flash, memory leak solid-map-gl — см. CLAUDE.md «Известные шероховатости»).

Этот документ — **не план фичи**. Это план **переключения режима** работы фреймворка с чёрного ящика на наблюдаемый. После него feature-работа возобновляется в новой инфраструктуре.

# Принцип

**Любой слой, который умеет молча принять решение, обязан это решение зафиксировать — даже успешное.**

Не «логировать ошибки». Не «иметь больше тестов». Конкретно: каждый wrapper / Vite-плагин / codegen / Proxy / wrapper-factory / registry имеет физический доступ ко всему что через него проходит. Сейчас этот доступ используется только на write-path (трансформировать, сгенерировать, перехватить). На trace-path — почти ничего. Мы это лечим.

Когда что-то рассыпется в системе с trace'ом — ты идёшь **вперёд по trace'у** от первого слоя. Когда без trace'а — реверс-инжиниришь от симптома через N слоёв.

# Что нарушалось — три класса (примеры из реальных сессий)

## Class A: Test theatre

`packages/builders/vite/src/plugins/appSourceServe.ts` имел 138 строк unit-тестов (`__tests__/appSourceServe.test.ts`), все green. Плагин в проде возвращал `text/html` вместо `text/javascript` — белый iframe. Корень: мок `makeMiddlewareMock` вызывал handler с `req.url = subPath` напрямую и читал переписанный `req.url` **внутри** handler'а. Реальный Connect: (а) strip-prefix на входе, (б) **restore `req.url` после `next()`**, (в) передача оригинала downstream. Этот контракт **не существовал в тесте**.

**Класс**: мок и тестируемый код — одна mental model. Если model неверна — оба согласованно сломаны, тест green.

Применимо к: каждый vite-плагин, ExportGeneratorPlugin против реального watcher'а, UiProxy против реального Solid-рендера с обновлением props, jsdom против реального браузера для virtual-scroll quirks.

Сегодня (2026-06-19) owner-builders переписал тест на «hand-rolled Connect harness воспроизводящий контракт по bundled-source». Это лучше, но всё ещё реверс-инжиниринг Connect'а. Канон — `import connect from 'connect'` или `import { createServer } from 'vite'` + fetch через real handler chain.

## Class B: Black-box silent failures

Прошлая сессия — iframe белый, ноль логов. Чтобы понять корень: (а) Connect source, (б) Vite middlewares chain, (в) console браузера, (г) curl content-type. **Ни один слой Capsule не сказал «`/src/standalone.tsx` упал в SPA fallback, ответ index.html»**.

Аналоги:
- Missing manifest entry → `undefined`
- Stale dist у workspace-пакета → silent old behavior + грабля для следующего dev
- `safeCall` в Controller → swallow (если повезёт `console.warn`)
- ExportGenerator не нашёл слой → `{}` в registry
- ControllerProxy не нашёл handler → `await next()` (валидный путь, не диагностика)
- UiProxy не нашёл `meta` → пропуск регистрации
- HMRWrappingPlugin не нашёл `export default` → пропуск + grабля «`<Pkg.X>` undefined» через 5 слоёв

Каждый silent **оправдан индивидуально** (HCA-баблинг, опциональность meta, soft-fail в hot-path). Складываются в **систему без громких ошибок**.

## Class C: Snowball через cross-layer cascades

Сейчас активных слоёв: Solid + XState + TanStack Router + UiProxy + ControllerProxy + ExportGenerator + RouterPlugin + HMRWrappingPlugin + AliasesPlugin + CompliancePlugin + AppSourceServePlugin + jiti-loader + slot registry + tag registry + global injection + UI-kit polymorphic Slot + createStyle + bridge.

Каждый имеет **неявный контракт со своими соседями**, живущий в:
- голове architect'а
- briefs / ADR (описывают желаемое, не enforce'ят)
- comments в коде (`// IMPORTANT: …`)
- CLAUDE.md «Известные шероховатости» — это и есть инвентарь снежного кома

`@capsuletech/compliance` ловит **структурные** нарушения (upward/horizontal import). Контракт реализации (типа «AppSourceServePlugin должен пережить Connect prefix-restore») — нет.

# Четыре якоря

Минимум который перекрывает все три класса. Каждый якорь маленький, независимый, может быть взят одним owner-агентом за один PR.

## Якорь 1 — Loud-by-default fallbacks в dev

**Принцип**: silent fallback → структурный `console.warn`/`debug` с тегом слоя.

**Scope (конкретные файлы где надо менять)**:
- `packages/web/core/src/engine/controller-proxy.ts` — `safeCall` swallow → warn с цепочкой `states[X] → top-level → next()`
- `packages/web/core/src/engine/ui-proxy.tsx` — пропуск элемента без meta → `debug` (не warn — это норма)
- `packages/builders/vite/src/plugins/ExportGeneratorPlugin/*` — missing default export → warn с file:line
- `packages/web/core/src/engine/logic-wrapper.tsx` — handler resolution miss → debug
- Slot/tag registry в `packages/web/core/src/registry/*` (если есть) — undefined return → warn с requested name

**Что меняется**: один shared namespace `[capsule:<layer>]` для всех логов. Уровни:
- `error` — реальная поломка, требует внимания
- `warn` — silent-fallback с реальным риском (handler не найден, default-export нет, missing slot)
- `debug` — нормальное поведение под trace (passthrough, opt-out meta, default-handler chain)

`debug` отключён без `CAPSULE_TRACE=1`.

**Как enforce'ится**: convention в OWNERSHIP-template — «no silent return without `console.{warn,debug}` with layer tag». Architect ревьюит в PR. Через 2-3 цикла станет рефлекс.

**Owner**: распределённо — owner-web-core (proxy + wrapper), owner-builders (плагины), остальные по своим зонам. Architect координирует convention.

**Cost**: ~неделя по 2-3 часа в день на пакет. Highest leverage / lowest cost = первый.

## Якорь 2 — Plugin trace contract

**Принцип**: каждый Capsule Vite-плагин проходит через shared trace-channel.

**Scope**:
- Новый модуль `packages/builders/vite/src/trace.ts` — экспортит `createTrace(plugin: string)` фабрика → `{entry, decision, passthrough, exit}` методы. Вывод через `console.debug` под `CAPSULE_TRACE=1`. Формат: `[capsule:plugin:<name>] entry GET /src/foo`, `[…] decision: rewrite → /@fs/.../foo`, `[…] passthrough: prefix mismatch`.
- Применяется в: AppSourceServePlugin (живой пример сегодняшнего бага), HMRWrappingPlugin, CompliancePlugin, AliasesPlugin, RouterPlugin, ExportGeneratorPlugin.
- Расширяется на Vite-плагины из `apps/<app>/.capsule/*` через тот же helper.

**Что меняется**: AppSourceServePlugin вчерашний с этим channel прошёл бы как «rewritten /src/X → /@fs/Y» **+** «middleware downstream получил GET /src/X» — несоответствие очевидно за 30 секунд `pnpm dev | tee trace.log`. Без channel — час reverse-engineering Connect-source.

**Как enforce'ится**: правило в OWNERSHIP-template для пакетов с Vite-плагинами + parameters в шаблон capsule.config.ts для apps. Тесты должны фиксировать что плагин ИСПУСКАЕТ trace при определённых input'ах.

**Owner**: owner-builders (модуль + миграция всех плагинов в packages/builders/vite).

**Cost**: 2-3 дня. Один PR с модулем + миграцией.

## Якорь 3 — Codegen audit log

**Принцип**: каждый codegen-плагин пишет `.capsule/.audit/<plugin>.log.json` при каждом запуске.

**Scope**:
- ExportGeneratorPlugin — что отсканировано (список input файлов с mtime), что эмитнуто (output файлы + размер + hash + diff против предыдущего запуска)
- RouterPlugin — pages найдены, routes сгенерены, routeTree.gen.ts hash
- HMRWrappingPlugin — список модулей которые получили wrap (file → wrapped Y/N + reason)

Формат — JSONL для diff'абельности. Вращается (последние 10 запусков).

**Что меняется**: вместо «открыл `.capsule/registry/wrappers.ts` и сравнил руками с тем что было» — `cat .capsule/.audit/export-generator.log.json | jq '.[-1]'` показывает последний run. Один-однострочник в консоли dev: «ExportGenerator regenerated 14 wrappers at HH:MM:SS, +1 widget RemoteDemo».

**Как enforce'ится**: convention в OWNERSHIP-template для codegen-плагинов. Каждый новый codegen-плагин — обязателен.

**Owner**: owner-builders (vite-плагины).

**Cost**: 1-2 дня. Lower priority — quality-of-life, не unblock.

## Якорь 4 — Integration-test convention для third-party границ

**Принцип**: где Capsule стыкуется с третьей стороной (Connect, Vite, Solid, jsdom, fetch, http) — мок запрещён, integration через реальную third-party обязателен.

**Scope**:
- Параграф в `docs/_meta/OWNERSHIP-template.md` — «Third-party boundary tests» секция.
- Apply ко всем owner-agent system-prompt'ам: «при тесте плагина против Vite/Connect — `import { createServer } from 'vite'` / `import connect from 'connect'`. Mock запрещён. Hand-rolled harness допустим только если third-party не bundled с pure-JS deps (rare)».
- Pilot — owner-builders применяет к каждому плагину в packages/builders/vite (5-6 файлов). После этого расширяется на web-core (Solid через `@solidjs/testing-library` real render), web-remote (real iframe в jsdom + real postMessage), web-renderer.
- Pre-merge check у architect'а — спрашивает у owner'а «есть integration-test для third-party границы?» в каждом PR.

**Что НЕ покрывается**: Browser E2E (это отдельный решение — Playwright наиболее очевидно). Будет следующим уровнем поверх 4. Сейчас — node-level integration через third-party real impl.

**Как enforce'ится**: OWNERSHIP-template + system-prompt owner-агентов + architect ревью.

**Owner**: architect (convention + template) → каждый owner для своей зоны.

**Cost**: convention writing — 1 час. Pilot owner-builders — 3-4 дня. Расширение остальным owner'ам — постепенно, по мере того как они трогают свои плагины/wrappers.

# Порядок landing'а

**1 → 2 → 4 → 3** по leverage/cost ratio.

- **1 (loud fallbacks)** — дешевле всех, видимо немедленно, разблокирует диагностику завтра.
- **2 (plugin trace)** — закрывает класс A+B для builder-layer, концентрированно в одной зоне (owner-builders).
- **4 (integration convention)** — закрывает класс A для будущих PR. Старые тесты не переписываем массово — только когда трогаем зону.
- **3 (codegen audit)** — quality of life, не блокирующий. Делается когда остальное в main.

# Что НЕ в скоупе

- **Big-bang rewrite существующего кода**. Меняем только когда трогаем зону по другой причине.
- **Production-mode trace** — отдельное обсуждение. Сейчас `CAPSULE_TRACE` только dev.
- **Performance instrumentation** — это `@capsuletech/web-profiler`, отдельный пакет.
- **Browser E2E (Playwright и т.п.)** — следующий слой поверх 4, отдельный план.
- **Замена Compliance плагина** — он остаётся для структурных правил, observability-якоря дополняют его.

# Открытые вопросы (для следующей сессии)

1. **Trace channel API shape** — простая `console.debug` обёртка или structured emitter с listener pattern (для аудита через файл)? Влияет на якорь 2.
2. **Counting vs logging в production** — для silent-fallback'ов в проде хочется counter (Prometheus-style), не лог. Где жить — `@capsuletech/web-profiler` или собственный модуль?
3. **E2E framework выбор** — Playwright/Cypress/own-thing на vite preview? Влияет на следующий после 4 якорь.
4. **Pilot для якоря 4** — фиксируем owner-builders как пилота, или сразу несколько owner'ов параллельно?
5. **OWNERSHIP-template обновления** — три новых секции (loud-fallbacks / trace-contract / third-party-tests). Кто пишет? Architect один PR в docs/.

# Что это даёт после landing'а 1+2

- **Класс A** (test theatre) — частично закрыт якорем 4 (новые тесты по правилу). Старые остаются (technical debt, постепенно).
- **Класс B** (silent failures) — закрыт якорями 1+2 для dev. Production — открытый вопрос #2.
- **Класс C** (snowball через cascade) — частично закрыт: trace позволяет найти первый слой каскада за минуты, не часы. Полное закрытие — браузерный E2E (следующий после 4).

После 1+2 web-remote Phase 1 demo возобновляется: на первом сценарии «iframe не оживает» trace показывает на каком слое потерялся URL/manifest/bootstrap. Цикл «час reverse-engineer'а → один-line fix» сокращается до «минута trace → точечный fix».

# Связано

- CLAUDE.md POLICY §0 (modules, no crutches) — observability это enabler для канона «фикс причины, не симптома»
- CLAUDE.md §«Известные шероховатости» — инвентарь снежного кома, который якорь 2+4 предотвращает от роста
- docs/_meta/cleanup-plan.md — другие живые инициативы по очистке
- memory `feedback_no_hypotheses_diagnose_with_tools` — без trace «диагностика инструментами» невозможна сейчас
- memory `feedback_root_cause_before_fix` — observability делает root-cause доступным
