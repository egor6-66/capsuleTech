---
tags: [hca, adr, proposed, web-remote, module-federation, iframe, shared-deps]
status: proposed
date: 2026-06-22
last_updated: 2026-06-22
supersedes: []
extends:
  - 015-remote-modules
  - 053-app-as-remote-symmetry-and-config-channel
---

> [!warning] Status: proposed
> Канон для внутренней архитектуры `@capsuletech/web-remote`: пакет построен над `@module-federation/vite` + кастомный iframe-transport runtime plugin. Public API (`<Remote.View>`, `<Remote.Provider>`, `useRemote()`, `IRemoteBootstrap`) — не меняется.

# ADR 056 — web-remote: Module Federation 2 + iframe-transport plugin

## Контекст

Capsule подключает приложения как remote-модули в двух одновременно действующих требованиях:

**Shared singleton dependencies.** Host и remote должны делить один экземпляр `solid-js`, `@capsuletech/web-core` и других runtime-singleton'ов — иначе reactivity / HCA identity рвутся. Это базовая задача micro-frontends, у которой есть индустриальный стандарт — Module Federation 2 (`@module-federation/vite`, stable в 2026, runtime decoupled от build tool).

**Iframe-isolation как граница безопасности.** Editor capsule mount'ит remote с user-defined / 3rd-party кодом — нужен scoped `window`, crash-isolation, separate HMR. Iframe — единственный production-ready primitive (ShadowRealm не в браузерах). Pure MF2 same-window такого не даёт.

Канон capsule по [[047-frontend-architecture-zones-cycle-vendor#принципы|ADR 047]]: уникальность за счёт HCA/Proxy/registry, не за счёт «своих» практик базовых задач. Shared-deps singleton — базовая задача, берём MF2. Iframe-isolation поверх MF2 — наш вклад через документированный extension point.

## Принципы

1. **MF2 — engine для shared-deps.** Capsule не реимплементирует resolution / dedup / singleton — это даёт `@module-federation/runtime`.
2. **Iframe-isolation — orthogonal plugin поверх MF2.** Через `loadEntry` hook (documented MF2 extension point: «fully customize how a remote entry is loaded or support a new remote type»).
3. **Public API стабильный.** Consumer'ы видят `Remote.*` namespace (ADR 033 registration), не MF API. Это даёт capsule свободу заменить transport (BroadcastChannel, socket) без breaking consumer'ов.
4. **App-as-Remote symmetry сохраняется** ([[053-app-as-remote-symmetry-and-config-channel|ADR 053]]). Любой `apps/<name>` подключаем как remote через `src/remote.ts` экспорт `bootstrap: IRemoteBootstrap`, не меняя HCA-код приложения.

## Decisions

### D1 — Shared deps через MF2 `shared` config {#D1}

Host и remote декларируют shared deps в Vite config через `@module-federation/vite`:

```ts
// apps/<host>/capsule.config.ts
federation({
  name: 'capsule-host',
  shared: {
    'solid-js': { singleton: true, requiredVersion: '^1.9.0' },
    'solid-js/web': { singleton: true },
    'solid-js/store': { singleton: true },
    '@capsuletech/web-core': { singleton: true },
    '@capsuletech/web-router': { singleton: true },
    '@capsuletech/web-state': { singleton: true },
    // финальный список — в `@capsuletech/vite-builder` пресете
  },
})
```

```ts
// apps/<remote>/capsule.config.ts
federation({
  name: 'universal-canvas',
  exposes: { './remote': './src/remote.ts' },
  shared: { /* зеркало host'а — singleton'ы по идентичной декларации */ },
})
```

MF2 runtime автоматически дедуплицирует — version mismatch выводит warning, identity сохранена.

**Capsule-уровень**: `@capsuletech/vite-builder` предоставляет пресет shared-deps (default singleton'ы), apps дописывают app-specific deps если нужно.

### D2 — Iframe-transport как MF2 runtime plugin {#D2}

`@capsuletech/web-remote` экспортирует `iframeTransportPlugin` — стандартный `FederationRuntimePlugin` через hook `loadEntry`:

```ts
// packages/web/runtime/remote/src/runtime/iframe-transport.ts
import type { FederationRuntimePlugin } from '@module-federation/runtime';

export const iframeTransportPlugin = (opts: IIframeTransportOpts): FederationRuntimePlugin => ({
  name: 'capsule-iframe-transport',
  loadEntry: async (args) => {
    // Mount iframe, инициализирует MF runtime внутри с host's shared scope,
    // возвращает MF entry-объект (factory + init).
  },
  beforeInitContainer: async (args) => {
    // Передаёт host shared scope в iframe container —
    // remote code в iframe резолвит singleton'ы через host'ский scope.
  },
});
```

`<Remote.Provider>` регистрирует этот plugin в MF runtime при инициализации.

**Iframe-isolation properties** (по дизайну plugin'а):
- Scoped `window` — user-code в iframe не leak'ает globals в host
- Crash-isolation — exception в iframe не валит host UI
- Separate HMR — обновление remote-кода не перезапускает host
- Shared singleton deps работают через MF shared scope (передаются через iframe boundary)

### D3 — Public API `@capsuletech/web-remote` {#D3}

Consumer-side API не меняется:

```tsx
<Remote.Provider modules={[{ name: 'universal-canvas', url: 'http://localhost:3000' }]}>
  <Remote.View
    name="universal-canvas"
    instanceId="left"
    config={{ apiUrl: '...' }}      // ambient config (ADR 053 Decision 3)
    schema={editorSchema()}         // reactive runtime props (ADR 053 Decision 4)
    onMounted={(payload) => {...}}  // auto-subscribe on*-props (ADR 053 Decision 5)
  />
</Remote.Provider>
```

Remote-side контракт — `apps/<remote>/src/remote.ts`:

```ts
import { createCapsuleApp } from '@capsuletech/web-core/bootstrap';
import type { IRemoteBootstrap } from '@capsuletech/web-remote';

export const bootstrap: IRemoteBootstrap = (root, ctx) =>
  createCapsuleApp(root, {
    routeTree,
    appConfig,
    configOverride: ctx.config,
    runtimeProps: ctx.props,
    eventSink: ctx.channel,
  });
```

App не знает что транспорт — iframe, и что под капотом MF2. Симметрия standalone ↔ embedded ([[053-app-as-remote-symmetry-and-config-channel|ADR 053 Decision 1]]) сохраняется.

### D4 — Структура пакета `packages/web/runtime/remote/` {#D4}

```
src/
  index.ts              public exports (Remote, useRemote, types)
  capsule.ts            ADR 033 registration (Remote.* namespace)
  interfaces.ts         IRemoteBootstrap, IRemoteChannel, IRemoteConfig
  runtime/
    RemoteProvider.tsx     инициализирует MF host runtime + регистрирует iframe-transport plugin
    RemoteView.tsx         dispatch на MF runtime через iframe-transport
    RemoteContext.ts       Solid Context для useRemote
    useRemote.ts           public hook
    iframe-transport.ts    MF2 runtime plugin (loadEntry hook impl)
    iframe-shell.ts        мини-shell, инициализирует MF runtime в iframe + ждёт remote module
```

Размер пакета — на порядок меньше custom runtime'а: shared-deps / manifest / version-negotiation / message-routing уносятся в MF2.

## Consequences

### Что capsule получает на выходе

1. **Multi-singleton решён декларативно** — `shared: { 'solid-js': { singleton: true } }`. Без runtime-хаков, без URL-introspection.
2. **Iframe-isolation сохранена** — наш plugin поверх стандартного MF2 hook'а.
3. **Стандартный mental model** — любой MF-знакомый dev открывает capsule remote config и работает. Не учит capsule-specific транспорт.
4. **MF2 ecosystem бесплатно** — typed remotes (TypeScript types между host и remote), manifest-based dynamic discovery, version negotiation, MF dev-tools.
5. **App-as-Remote symmetry сохранена** ([[053-app-as-remote-symmetry-and-config-channel|ADR 053]]).
6. **Public API стабильный** — consumer'ы (apps + editor) не зависят от внутренней реализации.
7. **Расширяемость transport'а** — будущие BroadcastChannel/socket transport'ы добавляются как orthogonal MF2 runtime plugin'ы рядом с iframe-plugin'ом, без breaking changes.

### Что capsule перестаёт делать

- Custom manifest format (`capsule.manifest.json`) — заменяется MF2 нативным.
- Custom shared-deps mechanism (import-map injection) — удаляется.
- Custom version negotiation — handled MF runtime'ом.
- Custom message-routing protocol (`__capsule_remote_*` envelopes) для shared-deps — заменяется MF shared scope.

`__capsule_remote_props__` / `__capsule_remote_config__` envelope'ы для runtime-props и ambient-config ([[053-app-as-remote-symmetry-and-config-channel|ADR 053 Decisions 3-4]]) остаются — это **business-данные** consumer ↔ remote, не infrastructure. Они идут через iframe-transport plugin как orthogonal channel поверх MF runtime.

## Связанное

- [[015-remote-modules]] — исходный контракт remote-runtime. Этот ADR amend'ит: custom runtime → MF2 hybrid.
- [[053-app-as-remote-symmetry-and-config-channel]] — App-as-Remote symmetry + двухканальный контракт (props vs config). Сохраняется полностью. Consequences про custom multi-Solid solution отменяются (multi-Solid решён MF2 нативно).
- [[047-frontend-architecture-zones-cycle-vendor]] — vendor-transparent принцип. Этот ADR — образцовая реализация принципа.
- [[033-package-registration]] — `Remote.*` namespace registration. Сохраняется.
