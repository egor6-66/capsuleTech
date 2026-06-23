---
name: "@capsuletech/web-remote"
owner-agent: owner-web-remote
group: web_base
zone: runtime
status: alpha
priority: P2
last-updated: 2026-06-23
---

# @capsuletech/web-remote

Universal wrapper making any capsule app embeddable as a module inside another app.
Own runtime (no `@module-federation/*`), pluggable transport layer, reactive registry.
Phase 1A: IframeTransport + two-channel contract (ADR-053).
Phase 1B: LocalShadowDomTransport + native ESM + shared-singleton import-map (ADR-057).

## Состояние (читать ПЕРВЫМ)

- **Zone:** `runtime` — module federation alternative.
- **Status:** `alpha` (0.0.0) — Phase 1B: dual transport (shadow-DOM default + iframe fallback) + manifest extension (ADR 057 §D2) + import-map validate-on-mount.
- **Priority:** **P2** — renderer-as-remote landing depends on this (Phase 1a).
- **Active blockers:**
  - DnD-through-iframe ADR (architect zone) — blocks renderer-as-remote embedding.
  - `createCapsuleApp` in `@capsuletech/web-core/bootstrap` (owner-web-core, Phase 1a).
  - `EmitProvider` for `useEmit → channel` routing (owner-web-core, Phase 1a).
  - `useAppConfig({ override })` (owner-web-query, Phase 1a).
- **Transport array assertion:** `transports: ITransport[]` array shape REQUIRED. Phase 1B
  populates `[LocalShadowDomTransport, IframeTransport]` (order = resolver priority — shadow-DOM
  wins for same-origin embedded; iframe is the fallback for cases shadow-DOM declines via
  `canReach`, currently standalone window / cross-origin — both Phase 2).
- **ADR 053 contract widening (Phase 1B).** `IRemoteBootstrap.root` widened from `HTMLElement`
  to `HTMLElement | ShadowRoot`. Additive — existing iframe-path bootstrap implementations
  type-check unchanged; shadow-DOM mount passes a `ShadowRoot` directly to `bootstrap()`.
  Both forms are valid `MountableElement` for Solid's `render()`. Flag to architect — minor
  ADR-053 amend pending.

## Vendor stack (ADR 047 D3)

- **Solid.js** (`solid-js` `^1.9.12`, peerDep) — reactive framework. https://docs.solidjs.com/

## Зона ответственности

### Owns

- `packages/web/runtime/remote/src/` (fully) — types, runtime, transports, provider, shell
- `packages/web/runtime/remote/package.json` exports / deps / peerDeps
- `packages/web/runtime/remote/vite.config.mts`
- `packages/web/runtime/remote/vitest.config.ts`
- `packages/web/runtime/remote/tsconfig*.json`
- `packages/web/runtime/remote/README.md`
- `packages/web/runtime/remote/OWNERSHIP.md`

### Не трогает

- `packages/web/router/*` — Phase 2 requires `openInWindow` in routerService; coordinate with owner-web-router.
- `packages/web/core/*` — Phase 5 service-inject in Widget/Feature + Phase 1a `createCapsuleApp`/`EmitProvider`; coordinate with owner-web-core.
- `packages/builders/*` — Phase 4 RemoteManifestPlugin + Phase 5 compliance rule; coordinate with owner-builders.
- `backend/*` — Phase 4 Rust crate `backend/mf-bus/`; escalate to user.
- Root-level `package.json`, `tsconfig.base.json`, `nx.json` — main assistant.
- `apps/*/` — user / framework-developer scope.

## Публичный API

Три entrypoint: `.` (runtime) + `./boot.js` (iframe-side shell dist-asset) + `./capsule` (ADR 033 registration manifest).

**Phase 0 types (unchanged):**

| Export | Type | Description |
|---|---|---|
| `IRemoteModuleConfig` | interface | `name`, `url`, `props?`, `config?`, `standaloneUrl?` |
| `IRemoteProviderProps` | interface | `serverUrl?`, `modules`, `config?`, `children?` |
| `IRemoteContext` | interface | `Remote`, `remote`, `updateModule`, `modules` |
| `IRemoteHandle` | interface | `send`, `request`, `on`, `openStandalone` |
| `IRemoteResponse<T>` | interface | `status`, `payload?`, `error?` |
| `IRemoteComponentProps` | interface | `name`, `instanceId?`, `fallback?`, `config?`, `[key]` |
| `IRemoteManifest` | interface | `name`, `version`, `entry`, `styles?`, `props?`, `events?` + Phase 1B additive: `$schema?`, `exposes?`, `shared?` (ADR 057 §D2) |
| `IRemoteSharedDep` | interface | One entry in `IRemoteManifest.shared`: `version`, `singleton` |
| `IRemoteMessage` | interface | Envelope; routing key `(to, toInstance, sessionId)` |
| `ITransport` | interface | `kind`, `canReach`, `send`, `onMessage`, `dispose` |
| `TransportKind` | type | `'local' \| 'local-shadow-dom' \| 'broadcast-channel' \| 'post-message' \| 'socket'` |

**Phase 1 additive types (ADR-053):**

| Export | Type | Description |
|---|---|---|
| `IRemoteBootstrap<P,C>` | interface | Module lifecycle entry: `(root, { props, config, channel }) => IRemoteDispose` |
| `IRemoteChannel` | interface | Module-side handle: `send`, `request`, `on` |
| `IRemoteDispose` | type | `() => void` — cleanup from bootstrap |

**Phase 1 runtime:**

| Export | Type | Description |
|---|---|---|
| `RemoteProvider` | component | Root provider. `config?` + `modules` + `children`. |
| `useRemote()` | hook | Returns `IRemoteContext`. Throws outside provider. |
| `RemoteView` | component | Thin wrapper over `useRemote().Remote`. Used as `Remote.View` global (ADR 033). |

**`./boot.js`** — iframe-side shell. Accessed via `import bootUrl from '@capsuletech/web-remote/boot.js?url'`. NOT imported directly.

**`./capsule`** — ADR 033 registration manifest. Registers `Remote.Provider` and `Remote.View` globals. Import: `import CapsuleRemote from '@capsuletech/web-remote/capsule'`.

## Reserved props (ADR-053 Decision 6)

| Class | Pattern | Action |
|---|---|---|
| **System** | `name`, `instanceId`, `fallback` | Host-side wire — NOT forwarded |
| **Config** | `config` | Merged host-side, sent via `__capsule_remote_config__` envelope |
| **Events** | `/^on[A-Z]/` | Auto-subscribed via `transport.onMessage` |
| **Runtime props** | Everything else | Forwarded via `__capsule_remote_props__` envelope |
| **children** | `children` | **TS-level ban** — composition across frame = future ADR |

Note: `online`, `onclick` (lowercase after `on`) do NOT match `/^on[A-Z]/` — safe as boolean props.

## Reserved namespace `__capsule_*`

Shell-internal envelope names:
- `__capsule_remote_ready__` — module → host ready handshake
- `__capsule_remote_props__` — host → module props envelope
- `__capsule_remote_config__` — host → module config envelope

User code `channel.on/send('__capsule_*', ...)` → `console.warn` + no-op.

## Config merge order (ADR-053 Decision 3)

```
provider.config → modules[name].config → <Remote config={...}>
```

Applied host-side in `RemoteComponent`. Module receives finalized snapshot.
`<Remote config={undefined}>` ≡ no prop (does NOT clear ambient config).

## Module instance singleton invariant {#singleton-invariant}

`RemoteContext = createContext()` вызывается **ровно один раз** на app. Subpath-split (`./capsule`, `./boot.js`) не должен создавать второй экземпляр.

**Правило:** каждый новый subpath в `package.json#exports` **обязан** получить запись в `tsconfig.base.json`. Без этого `AliasesPlugin.buildWorkspaceSrcAliases` не создаст Vite alias для subpath → Vite dev-server fallback на `dist/` → отдельный `createContext()` в dist-chunk → два `RemoteContext` объекта → `useRemote()` бросает «must be called inside RemoteProvider» даже внутри Provider.

Зафиксировано 2026-06-22: инцидент «host-side useRemote throws» — root cause именно missing tsconfig.base.json subpath alias. Фикс: Вариант B, PR `feat/remote-phase1a-singleton-fix`. Подробности: `docs/_meta/web-remote.md#singleton-invariant`.

Юнит-тест: `src/runtime/__tests__/dualImport.test.tsx` (4 cases). Node/jsdom не воспроизводит Vite-resolve грань — тест документирует API-инвариант, но НЕ является регрессионным smoke для dist-vs-src сценария. Реальный guard: ручной smoke `/workspace/web-studio` в `apps/playground` под `capsule dev`.

## Boot URL resolution {#boot-url-resolution}

`bootUrl` (iframe `<script type="module" src="${bootUrl}">`) **обязан** резолвиться через subpath + `?url`:

```ts
import bootUrl from '@capsuletech/web-remote/boot.js?url';
```

Vite резолвит через `package.json#exports './boot.js' → ./dist/boot.mjs`. URL указывает на built `.mjs` artifact независимо от того, откуда грузится сам `RemoteComponent` (`src` в dev — после singleton alias, `dist` в prod). Никаких layout-предположений.

**ЗАПРЕЩЕНО возвращать** runtime URL construction:
```ts
// ❌ layout-assumption: предполагает что RemoteComponent живёт в dist/chunks/
const bootUrl = new URL('../boot.mjs', import.meta.url).href;
```
Работало случайно до 2026-06-22 потому что `/capsule` subpath fallback'ил на `dist/capsule.mjs` → `RemoteComponent` приходил из dist. После singleton-фикса (tsconfig alias `/capsule → src/capsule.ts`) — `import.meta.url` указывает на src, относительный `../boot.mjs` резолвится в несуществующий `src/boot.mjs` → 404 в Vite dev-server.

**ЗАПРЕЩЕНО `?url` на TS source:**
```ts
// ❌ esbuild транспилит .ts и возвращает data:video/mp2t URL — браузер refuse'ит как ESM
import bootUrl from '../shell/boot.ts?url';
```
Это историческая regression (зафиксирована в comment'ах до 2026-06-22). Subpath через exports указывает на `.mjs` BUILT artifact — этот regression не применим.

**Invariant**: `boot.js` subpath НЕ должен получать alias в `tsconfig.base.json` (как `/capsule` — там alias нужен для singleton invariant). Без alias Vite резолвит через package exports → dist artifact, что и требуется.

## Transport (ADR 057 Phase 1B) {#transport-adr-057}

Internal mechanism. Two `ITransport` impls live in `src/transport/`, both registered by
`RemoteProvider` into the resolver pool. RemoteComponent picks per-mount via
`find(canReach)`; the picked transport's `kind` then dictates the mount path inside
RemoteComponent's dispatcher.

| Transport | `kind` | When picked | Mount path |
|---|---|---|---|
| `LocalShadowDomTransport` | `local-shadow-dom` | Same-origin, non-standalone (Phase 1B default) | Shadow-DOM: `await import(entry)` → `containerEl.attachShadow` → `manifest.styles[]` inject via `<link>` → `bootstrap(shadowRoot, { props, config, channel })` |
| `IframeTransport` | `post-message` | Fallback (Phase 2: standalone window, cross-origin) | Iframe srcdoc + `boot.ts` shell + `__capsule_remote_*` envelopes |

**Shadow-DOM substrate (Phase 1B canonical).**
- No iframe, no postMessage, no JSON serialization.
- Host + remote share one JS realm — shared singleton deps resolved via host's
  `<script type="importmap">` (ADR 057 §D1). Native ESM cache dedups module instances.
- Reactive props/config: Solid `createStore` reactively populated from `rawProps` at the
  dispatcher; module receives `Proxy` accessor objects (same shape as `boot.ts`
  `makeProxy`). Direct property reads tracked by Solid — enumeration is snapshot-only
  (ADR-053 Decision 4 caveat unchanged).
- Module-side `IRemoteChannel` built via `createModuleChannel(transport, ...)` —
  symmetric to `boot.ts` channel but dispatches in-realm. Reserved namespace guard
  (`__capsule_*`) preserved.
- CSS isolation via shadow root. `manifest.styles[]` inserted as `<link rel="stylesheet">`
  children of the shadow root — module's own CSS does not leak host-wards.

**Manifest extension (ADR 057 §D2).**
- Three additive fields read by Phase 1B fetcher: `$schema?`, `exposes?`, `shared?`.
- `RemoteProvider` validates each `manifest.shared` entry against the host's
  `<script type="importmap">` on mount (`validateSharedCompat`). Phase 1: strict
  version equality; mismatches surfaced as `console.error` (no throw — RemoteComponent's
  own resource controls user-visible fallback).
- Host import-map reading is DOM-side only — `@capsuletech/vite-builder` `SHARED_DEPS`
  const is build-time, never imported at runtime (it would drag node-only deps into
  the browser bundle).

**Iframe-flow envelopes (preserved verbatim).** Same `__capsule_remote_ready__` →
`__capsule_remote_props__` + `__capsule_remote_config__` → on* event-name protocol from
Phase 1A. Effects mounted at the dispatcher level so they fire before manifest resolves
(handshake-first); the shadow-DOM path skips them by gating on `kind === 'local-shadow-dom'`.

## Quirks / gotchas

- **`@module-federation/*` not used.** See ADR-015 Alternatives.
- **`instanceId` in routing key.** `(to, toInstance, sessionId)` — indivisible key. Two instances of the same module = 2 different endpoints. Do not make instanceId optional for routing.
- **`updateModule(name, { url })` forces remount** of all instances of that name (keyed via Solid store reconcile). Test-covered.
- **Reactive props = direct property access only.** `Object.keys(props)` / spread / JSON.stringify = snapshot, non-reactive. Module authors must use `createMemo(() => Object.keys(propsStore))` for dynamic iteration. ADR-053 Decision 4 caveat.
- **Serialization boundary — structured-clone.** Functions, Symbols, DOM nodes, class instances with private fields → silent drop via postMessage. Canonical path for callbacks = `on*` props, NOT regular props. ADR-053 risk #9.
- **`sandbox="allow-scripts allow-same-origin"` is NOT a security boundary.** Iframe with this pair sees parent cookies/localStorage. For same-origin trusted capsule apps — OK. Untrusted third-party → stricter sandbox + cross-origin (Phase 3+). ADR-053 risk #2.
- **DnD across iframe boundary — NOT supported in Phase 1.** Pointer events don't cross frame. Studio palette drag → renderer canvas drop requires a separate ADR. Escalate to architect. ADR-053 risk #3.
- **`openStandalone()` — Phase 2 feature.** Returns `undefined`, logs `console.warn`. Does NOT throw. Acceptance gate.
- **`boot.js` dist-asset, NOT inline srcdoc.** Import via `import bootUrl from '@capsuletech/web-remote/boot.js?url'`. Separate Vite entry in vite.config.mts.
- **Shadow-DOM mount needs working host import-map.** Phase 1B path expects
  `<script type="importmap">` injected by `@capsuletech/vite-builder` `ImportMapPlugin`
  (Phase 1A artifact). Without it, native `import 'solid-js'` inside the remote bundle
  falls back to default resolution → likely a second Solid instance → reactivity drop.
  `validateSharedCompat` surfaces the missing-pin case via `console.error` on
  Provider mount.
- **`createModuleChannel` is in-realm, not envelope-based.** Shadow-DOM channel
  dispatches via the same `LocalShadowDomTransport` subscriber set the host uses.
  Reserved-namespace guard (`__capsule_*`) preserved; user code calling
  `channel.send('__capsule_foo', ...)` warns and is a no-op, matching `boot.ts`.
- **`IRemoteBootstrap.root` widened to `HTMLElement | ShadowRoot`.** Existing
  bootstrap implementations that only forward `root` to Solid's `render()` are
  unaffected. Bootstraps that call DOM methods exclusive to `HTMLElement` (e.g.
  `.style`, `.click()`) without a runtime check would break on shadow-DOM mount —
  but those weren't legal under ADR-053 to begin with (root is the mount slot, not
  a regular element). Architect amend pending (see Состояние above).
- **Package not in release groups `nx.json`.** Version `0.0.0`, releases enabled after Phase 4. Do not `pnpm publish` without user agreement.

## Plan / Roadmap

- [x] **Phase 0 — type-contracts skeleton** — `src/interfaces.ts`, PR #77, merged 2026-05-19.
- [x] **Phase 1A — IframeTransport + two-channel + Provider + useRemote + boot.js** — ADR-053 consumer model.
- [x] **Phase 1B — LocalShadowDomTransport + native ESM + import-map validate** — ADR-057. This PR (working-tree, awaiting architect PR).
  - `LocalShadowDomTransport` ITransport impl (`src/transport/LocalShadowDomTransport.ts`).
  - `manifestFetcher` helpers (`src/runtime/manifestFetcher.ts`): `fetchManifest`,
    `readHostImportMap`, `parseSharedUrl`, `validateSharedCompat`.
  - `IRemoteManifest` additive: `$schema?`, `exposes?`, `shared?`.
  - `IRemoteBootstrap.root` widened to `HTMLElement | ShadowRoot` (minor ADR-053 amend, escalated).
  - RemoteComponent dual-path dispatcher: shadow-DOM mount (default) + iframe mount (fallback).
  - RemoteProvider populates both transports + runs `validateSharedCompat` on mount.
- [ ] **Phase 1a — followup (NOT blocking Phase 1 merge):**
  - `createCapsuleApp` helper in `@capsuletech/web-core/bootstrap` (owner-web-core)
  - `EmitProvider` for `useEmit → channel` routing (owner-web-core)
  - `capsule create-app` generates `src/standalone.ts` template (owner-cli + owner-builders)
  - `useAppConfig({ override })` canonical API (owner-web-query)
  - DnD-through-iframe ADR (architect zone)
  - Renderer-as-remote landing (depends on DnD ADR)
- [ ] **Phase 2 — iframe transport polish + multi-expose + semver compat + standalone window**
  - Force `isolation` opt-in for hardened iframe per-view selection.
  - Multi-expose manifest support (`exposes: { './a': '...', './b': '...' }`).
  - Semver compat in `validateSharedCompat` (replaces strict equality).
  - `openStandalone` polish (multi-Solid singleton in standalone window).
  - BroadcastChannelTransport + `routerService.openInWindow` (owner-web-router).
- [ ] **Phase 3 — cross-origin postMessage** — origin checks, stricter sandbox.
- [ ] **Phase 4 — socket transport** — `socket` transport, `backend/mf-bus/` Rust crate.
- [ ] **Phase 5 — Compliance rule** — `no-remote-in-controller` in `@capsuletech/compliance` (owner-builders).

## Test coverage

| Type | Location | Coverage |
|---|---|---|
| Unit | `src/transport/__tests__/IframeTransport.test.ts` | IframeTransport (9 cases) |
| Unit | `src/transport/__tests__/LocalShadowDomTransport.test.ts` | LocalShadowDomTransport canReach + dispatch + sessionId isolation + dispose (9 cases) |
| Unit | `src/runtime/__tests__/buildSrcdoc.test.ts` | buildSrcdoc pure fn (7 cases) |
| Unit | `src/runtime/__tests__/createHostHandle.test.ts` | createHostHandle (7 cases) |
| Unit | `src/runtime/__tests__/manifestFetcher.test.ts` | fetchManifest + readHostImportMap + parseSharedUrl + validateSharedCompat (19 cases) |
| Unit | `src/runtime/__tests__/RemoteProvider.test.tsx` | RemoteProvider + useRemote (6 cases) |
| Unit | `src/runtime/__tests__/RemoteComponent.test.tsx` | RemoteComponent 4-class props + merge + reactive (19 cases, iframe path) |
| Unit | `src/runtime/__tests__/RemoteComponentShadowDom.test.tsx` | RemoteComponent shadow-DOM mount path: branch selection + envelope-skip + on* subscribe (4 cases) |
| Unit | `src/runtime/__tests__/dualImport.test.tsx` | RemoteContext singleton invariant (4 cases) |
| Unit | `src/transport/__tests__/IframeTransport.test.ts` | smoke (additional, included above) |

Total: 86 unit tests. All green (verified Phase 1B 2026-06-23).

End-to-end shadow-DOM mount (real `await import(http://...)`, actual shadow root attach,
manifest.styles[] link injection, full bootstrap call) is verified by architect's real-browser
smoke per brief §Acceptance — not covered by jsdom unit tests because jsdom can't resolve
network URLs through native `import()`.

Phase 1 shell (boot.ts) — covered via E2E in demo (apps/remote-host + apps/remote-hello, separate PR). jsdom does not load real modules via dynamic import(url), so boot.ts is validated in real browser.

## Cross-package dependencies

| Zone | Owner | Phase |
|---|---|---|
| `routerService.openInWindow` | owner-web-router | Phase 2 |
| `createCapsuleApp` helper | owner-web-core | Phase 1a |
| `EmitProvider` (`useEmit → channel`) | owner-web-core | Phase 1a |
| `useAppConfig({ override })` | owner-web-query | Phase 1a |
| `RemoteManifestPlugin` in vite-builder | owner-builders | Phase 4 |
| Compliance rule `no-remote-in-controller` | owner-builders | Phase 5 |
| Socket-server Rust crate `backend/mf-bus/` | escalate to user | Phase 4 |
| DnD-through-iframe ADR | architect | Phase 1a |

## Release group

Package **not included** in any release group in `nx.json` — version `0.0.0`.
Releases enabled after Phase 4 stabilization. Separate group `remote` (own release cadence, not `web_base`). Decision to be confirmed with user.
