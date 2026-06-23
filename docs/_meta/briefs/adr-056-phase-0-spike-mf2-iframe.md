# Brief — Phase 0 spike: validate MF2 + iframe-transport feasibility (ADR 056)

**Zone**: `owner-web-remote`
**Type**: spike / proof-of-concept (throwaway code)
**Scope**: standalone `experiments/mf2-iframe-spike/` directory — НЕ трогает `packages/web/runtime/remote/`, `apps/playground/`, `apps/universal-canvas/`
**Goal**: pass/fail gate для [[../01-architecture/adr/056-web-remote-mf2-iframe-transport-hybrid|ADR 056]] до начала миграции
**Tree**: main shared working tree (`D:/CODING/projects/my/capsule`), branch `main`. Никаких worktree, никаких feature-веток сейчас. Ветка + PR создаются в конце фичи (spike + Phase 1 + …) по сигналу user.

---

## Что валидируем

Четыре hypothesis'а из ADR 056. **Если любой fails — ADR пересматривается, не миграция.**

### H1 — `loadEntry` hook MF2 действительно даёт iframe-transport

`@module-federation/runtime` plugin через hook `loadEntry` может полностью переопределить как remote entry загружается. Spike: написать ~50-150 LOC plugin'а который mount'ит remote в iframe вместо `<script>` tag.

**Pass**: host через MF2 API (`init({ remotes: [...], plugins: [iframePlugin] })`) успешно подключает remote, который реально живёт в iframe (видно в DevTools — `<iframe>` элемент с remote content внутри).

**Fail**: hook `loadEntry` не позволяет вернуть iframe-based entry в форме которую ожидает MF runtime (factory + init). Тогда смотрим в альтернативные hooks (`beforeInitContainer`, `afterResolve`) или признаём что MF2 архитектурно не поддерживает off-thread/cross-realm transport.

### H2 — Shared scope передаётся через iframe boundary

MF runtime в iframe получает host'ский shared scope (`solid-js` singleton declaration). Когда remote-code в iframe импортирует `solid-js` — MF resolution возвращает **host'ский экземпляр**, не свой.

**Pass**: в iframe console **нет** warning'а `[capsule/solid] multiple instances`. `(window.parent as any).__capsule_solid === currentSolidImport` — `true` (или эквивалентная проверка identity).

**Fail**: MF runtime в iframe не может консумировать host'ский shared scope (boundary не пересекается через `postMessage` adequate way). Тогда: альтернативные стратегии — например, expose Solid через `window.parent.__MF_SHARED__` ручным mechanism'ом поверх MF runtime.

### H3 — Reactive props end-to-end через MF shared scope

Host передаёт reactive prop в remote, изменение prop'а триггерит `createEffect` в remote (через shared Solid runtime). Это финальная цель — то что сегодня сломано в текущем custom Variant C.

**Acceptance (3 уровня):**

| Result | Что наблюдается | Trade-off |
|---|---|---|
| **PASS** | `[count, setCount] = createSignal(0)` в host, передан как accessor → `createEffect(() => count())` в iframe-remote re-runs на КАЖДЫЙ `setCount(n)`. Pure MF shared, без channel. | ADR 056 D2 валиден, идём в Phase 1 как есть. |
| **PARTIAL** | Signal-level cross-realm не работает, но `createMutable(obj)` / store через MF shared module-state + cross-realm subscription работает. | ADR 056 D1 amend — API surface сужается до store/mutable. Architect ревизует. |
| **FAIL** | Reactive identity не пересекает realm вообще — нужен наш postMessage-channel с явной репликацией. Тогда это не "MF shared даёт реактивность", а наш channel поверх. | ADR 056 D2 amend — channel-broker поверх MF. Финальный архитектурный пересмотр. |

Документируй явно какой из трёх. Не пытайся "подкрутить чтобы заработало" — нам нужен честный сигнал что именно работает в стоковой связке.

### H4 — Vite + MF2 + solidPlugin минимальный стек работает

**Софт-claim (final):** `@module-federation/vite` + `solidPlugin` + наш `iframeTransportPlugin` runtime — host и remote Vite-конфиги собираются (`vite dev` достаточно) без crash. **БЕЗ** capsule plugins (Compliance/HMRWrapping/Router/ExportGenerator из `packages/builders/vite/src/plugins/`) — их интеграция переезжает в Phase 1.

**Pass**: оба сервера (host + remote) стартуют, host загружает remote через MF runtime, нет fatal errors в console.

**Fail**: stock MF2 plugin несовместим с базовым solidPlugin (несовместимая module-graph манипуляция, неработающий JSX transform, etc.) — фундаментальная блокировка, ADR 056 пересматривается полностью.

**Findings field**: всё что замечено как potential conflict с capsule plugins (например, MF2 эмиттит chunks которые HMRWrapping potentially нарушит) — фиксируй как **Phase 1 risk**, НЕ как H4 fail. Capsule integration валидируется в Phase 1.

## Setup (что строим в spike)

**Структура:**

```
experiments/mf2-iframe-spike/
  host/                     минимальное host-приложение (Vite + Solid)
    src/
      index.tsx             initSolidJS + MF init + рендер UI с button + remote
      iframe-transport.ts   наш MF2 runtime plugin (loadEntry hook)
    index.html
    vite.config.ts          @module-federation/vite + minimal capsule plugins
    package.json
  remote/                   минимальное remote-приложение (Vite + Solid)
    src/
      index.tsx             экспозит компонент с createEffect на reactive prop
    index.html
    vite.config.ts          @module-federation/vite expose config
    package.json
  README.md                 как запустить spike (cd host && vite, cd remote && vite)
```

**НЕ используем:** `@capsuletech/web-remote`, `@capsuletech/web-core`, `@capsuletech/vite-builder` — это spike для валидации **самой связки MF2+iframe**, а не интеграции capsule. Capsule integration — задача Phase 1, после green spike'а.

**Используем:** `solid-js`, `vite`, `@module-federation/vite`, `@module-federation/runtime`. Минимум deps.

## Структура iframe-transport plugin (skeleton)

```ts
// experiments/mf2-iframe-spike/host/src/iframe-transport.ts
import type { FederationRuntimePlugin } from '@module-federation/runtime';

export interface IIframeTransportOpts {
  // куда mount'ить iframe (selector или HTMLElement)
  container: HTMLElement | (() => HTMLElement);
  // дополнительные iframe attrs (sandbox, allow и т.д.)
  iframeAttrs?: Partial<HTMLIFrameElement>;
}

export const iframeTransportPlugin = (opts: IIframeTransportOpts): FederationRuntimePlugin => ({
  name: 'spike-iframe-transport',
  loadEntry: async (args) => {
    // 1. Создать iframe element
    // 2. Загрузить в iframe minimal HTML с MF runtime + remote entry
    // 3. Передать host shared scope в iframe (через postMessage или window injection)
    // 4. Вернуть entry-объект ожидаемой MF runtime формы
    throw new Error('TODO: implement');
  },
  beforeInitContainer: async (args) => {
    // Inject host shared scope mapping в iframe container
    // (детали зависят от того что MF runtime ожидает)
    throw new Error('TODO: implement');
  },
});
```

Реализация — twostep:
1. **Step A**: hardcoded iframe creation + load remote URL → validate H1 (iframe mountится, MF runtime инициализируется)
2. **Step B**: shared scope передача через `beforeInitContainer` + postMessage bridge → validate H2 + H3

Если Step A fails — H1 fail, остановка, отчёт.
Если Step B fails — H2/H3 fail, остановка, отчёт.

## Acceptance criteria (spike report)

Spike считается **green** если все 4 hypothesis pass. Отчёт сдаётся в форме `experiments/mf2-iframe-spike/SPIKE-REPORT.md` со структурой:

```markdown
# Spike Report — MF2 + iframe-transport

**Date**: YYYY-MM-DD
**Result**: GREEN / RED

## H1 — loadEntry iframe-transport
Result: PASS / FAIL
Evidence: <screenshots, console output, code snippets>

## H2 — Shared scope через iframe boundary
Result: PASS / FAIL
Evidence: ...

## H3 — Reactive props end-to-end
Result: PASS / FAIL
Evidence: ...

## H4 — Vite + MF2 + capsule plugin stack
Result: PASS / FAIL
Evidence: ...

## Findings
- <неожиданные открытия / caveats / API quirks которые повлияют на Phase 1>

## Code highlights
- iframe-transport.ts (~N LOC) — promotable to packages/web/runtime/remote/src/runtime/iframe-transport.ts: YES / NO
- Host/Remote MF config — promotable to @capsuletech/vite-builder preset: YES / NO

## Recommendation
- Proceed to Phase 1 / Revise ADR 056 / Abort approach
```

## Что НЕ делать в spike

- НЕ трогать `packages/web/runtime/remote/` — текущий код остаётся неизменным
- НЕ интегрировать с capsule HCA / wrappers (Entity / Widget / Page / Controller / Feature) — spike про **transport mechanism**, не про HCA
- НЕ оптимизировать (`shared:` config minimal — `solid-js` + `solid-js/store` хватит для validation H2/H3)
- НЕ писать тесты unit/e2e — spike это throwaway proof. Validation через manual browser inspection + DevTools.
- НЕ делать pretty UI — host = одна кнопка + один `<iframe>`, remote = один счётчик. Cosmetic за рамками.
- НЕ покрывать prod build — `vite dev` режима достаточно для validation (H4 — только что dev стартует, prod — Phase 1+ concern).

## Git workflow

- **НЕ коммитить.** Работаешь в shared main tree (HEAD = main). Pre-commit hook режет direct commits на main — это намеренно. Оставляешь working tree в готовом-для-ревью состоянии.
- Архитектор + user возвращаются, ревьюят SPIKE-REPORT.md + код в working tree, решают:
  - Если GREEN — фича продолжается (Phase 1). Ветка + PR создаются позже по сигналу user (вся фича = один cross-package PR per `feedback_git_scope_by_change_shape`).
  - Если RED — обсуждаем ADR revision, код spike может быть выкинут.
- Если по ходу spike нужно сохранить промежуточное состояние — это в SPIKE-REPORT.md / WIP-notes в файлах spike'а, не через git stash/commit.

## После spike'а

**Если GREEN** (4/4 H pass — H3 PASS или PARTIAL):
- ADR 056 status `proposed` → `accepted` (architect)
- Architect пишет следующий бриф: Phase 1 (core MF integration в `@capsuletech/web-remote`)
- Owner-remote продолжает работу в той же shared main tree — Phase 1 коммитится в общий накопитель фичи, ветка/PR в конце по сигналу user

**Если PARTIAL** (H3 = (b) store/mutable, не signal):
- ADR 056 D1 amend — API surface сужается до store/mutable. Architect ревизует.
- Phase 1 стартует с обновлённого контракта.

**Если RED** (H1/H2/H4 fail или H3 = (c) channel-only):
- ADR 056 пересматривается полностью — findings + предложение revision/replacement ADR. Phase 1 НЕ стартует.

## Связанное

- [[../01-architecture/adr/056-web-remote-mf2-iframe-transport-hybrid|ADR 056]] — этот spike валидирует D1-D2
- [[../01-architecture/adr/053-app-as-remote-symmetry-and-config-channel|ADR 053]] — App-as-Remote symmetry, симметрия standalone↔embedded которую финальная архитектура сохранит
- [Module Federation Runtime Plugins docs](https://module-federation.io/guide/runtime/runtime-plugins) — официальная документация hook'ов
- [@module-federation/vite GitHub](https://github.com/module-federation/vite) — Vite plugin
