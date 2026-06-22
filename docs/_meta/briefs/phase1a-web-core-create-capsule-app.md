---
title: 'web-core Phase 1a — createCapsuleApp helper + shared Solid bundle for embedded apps'
status: ready
audience: owner-web-core
last_updated: 2026-06-22
adr:
  - docs/01-architecture/adr/053-app-as-remote-symmetry-and-config-channel.md (consequences 7a + 7b)
ai-anchor: docs/_meta/web-core.md
relates:
  - PR #398 (RemoteManifestPlugin Phase 1a + canvas→host smoke)
  - docs/_meta/briefs/phase1a-web-remote-context-singleton.md (parallel host-side fix in owner-web-remote)
---

# Контекст

PR #398 закрыл **canvas→host** direction для `@capsuletech/web-remote` (auto-subscribe `on*`-prop, Decision 5 ADR-053). **Host→canvas** через два канонических пути ADR-053 — `reactive props` (Decision 4) и `useRemote().remote(name).send()` — оба **сломаны**:

1. **Reactive props через iframe boundary не реактивен.** Smoke 2026-06-22 показал: host меняет signal → `RemoteComponent` шлёт `__capsule_remote_props__` envelope → boot.ts получает и пишет `setPropsStore(reconcile(...))` → но `createEffect(() => ctx.props.pingCount)` в user-bootstrap'е **не триггерится**. Корень — в iframe два инстанса Solid:
   - `boot.mjs` грузится с playground vite-dev (parent origin) → импортит `solid-js/store` из playground'a.
   - `src/remote.ts` грузится с universal-canvas vite-dev (manifest.entry origin) → импортит `solid-js` из universal-canvas.
   - Два разных ESM-URL для `solid-js` → два инстанса runtime'а → store, созданный в boot.mjs, не нотифицирует effects, созданные в remote.ts.
   - Symptom: console.warn `[capsule/solid] You appear to have multiple instances of Solid`.

2. **`useRemote()` outside Provider в host.** Параллельно — см. parallel brief `phase1a-web-remote-context-singleton.md`. Не зона web-core.

ADR-053 consequences 7a + 7b явно фиксируют это как Phase 1a backlog. Сейчас закрываем.

# Скоп

Канонический `createCapsuleApp` helper в `@capsuletech/web-core/bootstrap` (новый subpath), который:

1. **Унифицирует bootstrap-цепочку standalone vs embedded.** Сейчас generated `.capsule/bootstrap.tsx` собирает `<BaseProviders routeTree=... />` и `.capsule/remote-entry.ts` (после PR #398) дёргает `createRoot(Bootstrap)` + user's `bootstrap(root, ctx)`. Это разбросано по двум сгенеренным файлам + plugin'у. `createCapsuleApp(root, opts)` собирает всё в одну функцию canon-уровня:
   ```ts
   import { createCapsuleApp } from '@capsuletech/web-core/bootstrap';

   export const bootstrap: IRemoteBootstrap = (root, ctx) =>
     createCapsuleApp(root, {
       routeTree,
       appConfig,
       configOverride: ctx.config,
       runtimeProps: ctx.props,
       eventSink: ctx.channel,
     });
   ```
   - В standalone (`main.tsx`) — `createCapsuleApp(document.getElementById('app'), { routeTree, appConfig })` без `configOverride`/`runtimeProps`/`eventSink`.
   - В embedded — те же поля + три bridge'а от host'а.
   - **Внутри HCA-слоёв (`useAppConfig`, `useEmit`) код один и тот же** — не знает в каком режиме живёт.

2. **Резолвит multi-Solid в iframe — shared Solid bundle.** Pre-bundle `solid-js` + `solid-js/store` + `solid-js/web` в один артефакт, который грузится **только один раз** в iframe. Варианты реализации (выбрать):

   **Вариант A (preferred)** — peer-dep injection. boot.mjs принимает `solid` через `window.__CAPSULE_SOLID__` global, инжекчиваемый srcdoc'ом до загрузки boot.mjs. user's `remote.ts` (и весь bootstrap chain) использует **тот же** global вместо `import 'solid-js'`. `createCapsuleApp` инкапсулирует это — пользовательский код всё так же пишет `import { createSignal } from 'solid-js'`, helper подменяет резолюцию.

   **Вариант B** — bundled iframe-shell. Все web-remote + solid + base providers сборкаются в один ESM-bundle, доступный по URL `/web-remote/iframe-shell.mjs`. Manifest указывает на app-side entry, но shell-bundle гарантирует один solid instance.

   **Вариант C** — import-map injection. iframe srcdoc'у инжекчивается `<script type="importmap">{ "imports": { "solid-js": "${parentOrigin}/solid-js.mjs" } }</script>` — все импорты solid-js резолвятся к одному URL.

   Acceptance: после фикса multi-Solid warning в iframe **не выводится**. `createEffect(() => ctx.props.X)` в user-bootstrap'е реагирует на изменения `<Remote.View X={signal()} />` на хосте (Decision 4 ADR-053 работает end-to-end).

3. **EmitProvider routing для embedded apps.** `useEmit` (ADR-032, web-core/engine/use-emit) в standalone-режиме диспатчит через локальную event-шину. В embedded — должен через `ctx.channel.send`. `createCapsuleApp` принимает `eventSink: IRemoteChannel | undefined`; если задан, оборачивает `EmitProvider` (новый компонент в web-core) который маршрутизирует useEmit-события в channel вместо локальной шины. HCA-слой код не меняется.

# Subpath layout

```
packages/web/runtime/core/src/bootstrap/
  index.ts                  // export createCapsuleApp + ICreateCapsuleAppOptions
  createCapsuleApp.tsx      // implementation
  EmitProvider.tsx          // routes useEmit → eventSink | localBus
  solidBundleShim.ts        // (Вариант A/C — solid-resolution shim)
  __tests__/
    createCapsuleApp.test.tsx
    EmitProvider.test.tsx
```

`package.json#exports` добавить `"./bootstrap": { ... }`.

# Acceptance

- [ ] `createCapsuleApp(root, opts): () => void` опубликован из `@capsuletech/web-core/bootstrap`. Сигнатура опций:
  ```ts
  interface ICreateCapsuleAppOptions {
    routeTree: AnyRoute;
    appConfig: IAppConfig;
    /** ADR-053 embedded mode — host config envelope. */
    configOverride?: Record<string, unknown>;
    /** ADR-053 embedded mode — host props envelope (reactive proxy). */
    runtimeProps?: Record<string, unknown>;
    /** ADR-053 embedded mode — channel for useEmit routing. */
    eventSink?: IRemoteChannel;
    /** Standalone mode — default container theme. */
    defaultTheme?: string;
  }
  ```
- [ ] `EmitProvider` маршрутизирует `useEmit('eventName', payload)` в `eventSink.send(eventName, payload)` если задан; иначе в локальную шину (текущее behavior).
- [ ] Multi-Solid warning в iframe устранён (любой из вариантов A/B/C — выбор за owner-web-core). Тест: `createEffect(() => ctx.props.X)` в `apps/universal-canvas/src/remote.ts` реагирует на host-side изменения `<Remote.View X={signal()}>`.
- [ ] `RemoteManifestPlugin` (vite-builder) НЕ менять напрямую — но после landing'а этого PR можно опционально упростить generated `.capsule/remote-entry.ts` (заменить inline `createRoot(Bootstrap)` на `createCapsuleApp`). Координация с owner-builders в **отдельном** follow-up PR, не блокирует acceptance этого.
- [ ] Юнит-тесты: `createCapsuleApp` mount/unmount cycle, `EmitProvider` routing (eventSink vs localBus), multi-Solid suppression (если testable — может потребовать e2e в iframe-fixture).
- [ ] Smoke: `apps/universal-canvas/src/remote.ts` переписан на `createCapsuleApp(root, { ..., configOverride: ctx.config, runtimeProps: ctx.props, eventSink: ctx.channel })`. `apps/playground/src/widgets/studio/canvas.tsx` шлёт reactive prop `<Remote.View pingCount={signal()}>` — канвас читает через HCA-слой (Feature / Controller) и реагирует. Каноничный host→canvas direction работает end-to-end.
- [ ] AI-anchor `docs/_meta/web-core.md` обновлён: новый subpath `/bootstrap`, gotcha про multi-Solid resolution.

# Что НЕ в этом PR

- **Dual-instance RemoteContext в host'е** — parallel brief в owner-web-remote (`phase1a-web-remote-context-singleton.md`). Они независимы; этот PR может мержиться первым.
- Cross-origin iframe (Phase 2+) — отдельный ADR.
- `useAppConfig({ override })` canonical API — followup в зоне owner-web-query (ADR-053 consequence 7).
- Реализация специфичных canonical helpers (BroadcastChannelTransport и т.д.) — Phase 2+, не блокирует этот PR.

# Контекст для root cause

См. memory `feedback_check_generated_entry_first` + `project_remote_manifest_phase1a` — история инцидента 2026-06-22 (2+ часа угадайки из-за того что entry-генератор плагина выбрасывал ctx + multi-Solid маскировал reactive-props путь).
