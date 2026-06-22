---
name: "@capsuletech/web-remote"
owner-agent: owner-web-remote
group: web_base
zone: runtime
status: alpha
priority: P2
last-updated: 2026-06-19
---

# @capsuletech/web-remote

Universal wrapper making any capsule app embeddable as a module inside another app.
Own runtime (no `@module-federation/*`), pluggable transport layer, reactive registry.
Phase 1: IframeTransport + two-channel contract (ADR-053).

## Состояние (читать ПЕРВЫМ)

- **Zone:** `runtime` — module federation alternative.
- **Status:** `alpha` (0.0.0) — Phase 1: IframeTransport + RemoteProvider + useRemote + two-channel.
- **Priority:** **P2** — renderer-as-remote landing depends on this (Phase 1a).
- **Active blockers:**
  - DnD-through-iframe ADR (architect zone) — blocks renderer-as-remote embedding.
  - `createCapsuleApp` in `@capsuletech/web-core/bootstrap` (owner-web-core, Phase 1a).
  - `EmitProvider` for `useEmit → channel` routing (owner-web-core, Phase 1a).
  - `useAppConfig({ override })` (owner-web-query, Phase 1a).
- **Transport array assertion:** `transports: ITransport[]` array shape REQUIRED even with a single
  transport. Single-transport hardcode is forbidden — Phase 2+ adds BroadcastChannelTransport
  to the array without changing consumer API. See ADR-053 Decision 8.

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
| `IRemoteManifest` | interface | `name`, `version`, `entry`, `styles?`, `props?`, `events?` |
| `IRemoteMessage` | interface | Envelope; routing key `(to, toInstance, sessionId)` |
| `ITransport` | interface | `kind`, `canReach`, `send`, `onMessage`, `dispose` |
| `TransportKind` | type | `'local' \| 'broadcast-channel' \| 'post-message' \| 'socket'` |

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
- **Package not in release groups `nx.json`.** Version `0.0.0`, releases enabled after Phase 4. Do not `pnpm publish` without user agreement.

## Plan / Roadmap

- [x] **Phase 0 — type-contracts skeleton** — `src/interfaces.ts`, PR #77, merged 2026-05-19.
- [x] **Phase 1 — IframeTransport + two-channel + Provider + useRemote + boot.js** — ADR-053 consumer model. This PR.
- [ ] **Phase 1a — followup (NOT blocking Phase 1 merge):**
  - `createCapsuleApp` helper in `@capsuletech/web-core/bootstrap` (owner-web-core)
  - `EmitProvider` for `useEmit → channel` routing (owner-web-core)
  - `capsule create-app` generates `src/standalone.ts` template (owner-cli + owner-builders)
  - `useAppConfig({ override })` canonical API (owner-web-query)
  - DnD-through-iframe ADR (architect zone)
  - Renderer-as-remote landing (depends on DnD ADR)
- [ ] **Phase 2 — BroadcastChannel + standalone window** — `routerService.openInWindow` (owner-web-router).
- [ ] **Phase 3 — cross-origin postMessage** — origin checks, stricter sandbox.
- [ ] **Phase 4 — socket transport + RemoteManifestPlugin** — `socket` transport, `backend/mf-bus/` Rust crate. `RemoteManifestPlugin` for remote module builds.
- [ ] **Phase 5 — Compliance rule** — `no-remote-in-controller` in `@capsuletech/compliance` (owner-builders).

## Test coverage

| Type | Location | Coverage |
|---|---|---|
| Unit | `src/transport/__tests__/IframeTransport.test.ts` | IframeTransport (9 cases) |
| Unit | `src/runtime/__tests__/buildSrcdoc.test.ts` | buildSrcdoc pure fn (7 cases) |
| Unit | `src/runtime/__tests__/createHostHandle.test.ts` | createHostHandle (7 cases) |
| Unit | `src/runtime/__tests__/RemoteProvider.test.tsx` | RemoteProvider + useRemote (6 cases) |
| Unit | `src/runtime/__tests__/RemoteComponent.test.tsx` | RemoteComponent 4-class props + merge + reactive (19 cases) |

Total: 48 unit tests. All green.

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
