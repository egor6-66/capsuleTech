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
Own runtime (no `@module-federation/*`), postMessage transport, reactive registry.
app-mode (ADR 059) = `<iframe src>` on the app's own URL: the app boots itself
(own solid/router), the host talks only via postMessage — no srcdoc, no boot shell,
no import-map, no manifest fetch.

## Состояние (читать ПЕРВЫМ)

- **Zone:** `runtime` — module federation alternative.
- **Status:** `alpha` (0.0.0) — IframeTransport + RemoteProvider + useRemote; app-mode = iframe-src (ADR 059).
- **Priority:** **P2** — renderer-as-remote landing depends on this (Phase 1a).
- **Landed (Brief 1, web-core):** `createCapsuleApp` + embed-handshake (`EMBED_PROTOCOL`,
  `startHandshake`, config-override store) + `EmitProvider` — in `@capsuletech/web-core/bootstrap`.
  web-remote imports `EMBED_PROTOCOL` from there as the protocol source of truth.
- **Active blockers:**
  - Browser-verify of iframe-src app-mode (owner-tests, real browser) — gates the cross-zone cleanup below.
  - DnD-through-iframe ADR (architect zone) — blocks renderer-as-remote embedding.
- **Transport array assertion:** `transports: ITransport[]` array shape kept even with a single
  transport — the shape is the seam, so a future transport can be appended without changing
  consumer API. But `broadcast-channel` / `socket` are **YAGNI now** (ADR 058 D2), NOT a planned
  "Phase 2" — re-add only when a real cross-realm/cross-device case lands. Substrate is chosen by
  the explicit `mode` prop (ADR 058 D3), not by origin probing — there is no `canReach` resolver.

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

Два entrypoint: `.` (runtime) + `./capsule` (ADR 033 registration manifest). `./boot.js`
shell удалён (ADR 059 — app грузится по `<iframe src>`, host-injected shell не нужен).

**Phase 0 types (unchanged):**

| Export | Type | Description |
|---|---|---|
| `IRemoteModuleConfig` | interface | `name`, `url`, `props?`, `config?`, `standaloneUrl?` |
| `IRemoteProviderProps` | interface | `serverUrl?`, `modules`, `config?`, `children?` |
| `IRemoteContext` | interface | `Remote`, `remote`, `updateModule`, `modules` |
| `IRemoteHandle` | interface | `send`, `request`, `on`, `openStandalone` |
| `IRemoteResponse<T>` | interface | `status`, `payload?`, `error?` |
| `IRemoteComponentProps` | interface | `name`, `instanceId?`, `fallback?`, `config?`, `mode?`, `[key]` |
| `IRemoteManifest` | interface | `name`, `version`, `entry`, `styles?`, `props?`, `events?` |
| `IRemoteMessage` | interface | Envelope; routing key `(to, toInstance, sessionId)` |
| `ITransport` | interface | `kind`, `send`, `onMessage`, `dispose` (no `canReach` — ADR 058 D3) |
| `TransportKind` | type | `'post-message'` (single transport — ADR 058 D2) |

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

**`./capsule`** — ADR 033 registration manifest. Registers `Remote.Provider` and `Remote.View` globals. Import: `import CapsuleRemote from '@capsuletech/web-remote/capsule'`.

## Reserved props (ADR-053 Decision 6)

| Class | Pattern | Action |
|---|---|---|
| **System** | `name`, `instanceId`, `fallback`, `mode` | Host-side wire — NOT forwarded |
| **Substrate** | `mode` | `'app'` (default, iframe) \| `'component'` (shadow-DOM seam, not impl — ADR 058 D3) |
| **Config** | `config` | Merged host-side, sent via `__capsule_remote_config__` override patch (ADR 059 D4) |
| **Events** | `/^on[A-Z]/` | Auto-subscribed via `transport.onMessage` (app → host) |
| **Other keys** | Everything else | Accepted by the type but **ignored at runtime** — no props channel (ADR 059 D4); pass via `config` |
| **children** | `children` | **TS-level ban** — composition across frame = future ADR |

Note: `online`, `onclick` (lowercase after `on`) do NOT match `/^on[A-Z]/` — safe as boolean props.

## Reserved namespace `__capsule_*`

Envelope names (protocol source of truth = `EMBED_PROTOCOL` in `@capsuletech/web-core/bootstrap` — import, don't hardcode):
- `__capsule_app_ready__` (`EMBED_PROTOCOL.readyEvent`) — app → host ready signal (app posts on mount).
- `__capsule_remote_config__` (`EMBED_PROTOCOL.configEvent`) — host → app config override patch (ADR 059 D4).
- ~~`__capsule_remote_props__`~~ — **removed (ADR 059 D4: host→app = config only, no props channel).**

User code `channel.on/send('__capsule_*', ...)` → `console.warn` + no-op.

## Config merge order (ADR-053 Decision 3)

```
provider.config → modules[name].config → <Remote config={...}>
```

Applied host-side in `RemoteComponent`. Module receives finalized snapshot.
`<Remote config={undefined}>` ≡ no prop (does NOT clear ambient config).

## Module instance singleton invariant {#singleton-invariant}

`RemoteContext = createContext()` вызывается **ровно один раз** на app. Subpath-split (`./capsule`) не должен создавать второй экземпляр.

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
- **app-mode = `<iframe src>`, NOT srcdoc/boot (ADR 059).** The app loads itself from its own URL (`${module.url}/?__capsule_session=…&__capsule_name=…`) and boots via `createCapsuleApp` (web-core). No host-injected shell / import-map / manifest fetch.
- **Unavailable degradation = timeout, not `onerror`.** Host can't reliably observe a cross-origin iframe load failure via `onerror`; falls back to `[data-capsule-remote-error]` placeholder after `MOUNT_TIMEOUT_MS` (5s) without `__capsule_app_ready__`.
- **One sessionId per provider.** The iframe query carries the provider sessionId; host→app config is routed to the right iframe by the `(name, instanceId)` registry (postMessage to its contentWindow), the app accepts by `sessionId`+`name`. Multiple instances of the same module name aren't disambiguated on the app→host ready/event direction — known limit, fine for current single-instance cases.
- **Package not in release groups `nx.json`.** Version `0.0.0`, releases enabled after Phase 4. Do not `pnpm publish` without user agreement.

## Plan / Roadmap

- [x] **Phase 0 — type-contracts skeleton** — `src/interfaces.ts`, PR #77, merged 2026-05-19.
- [x] **Phase 1 — IframeTransport + Provider + useRemote** — ADR-053 consumer model.
- [x] **ADR 058 — message-only + mode-by-intent seam; drop canReach resolver.**
- [x] **ADR 059 — app-mode = iframe-src self-contained + config-override.** srcdoc/boot/import-map/manifest-fetch removed from app-path. Browser-verify pending (owner-tests).
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
| Unit | `src/transport/__tests__/IframeTransport.test.ts` | IframeTransport register/send/broadcast/dispose |
| Unit | `src/runtime/__tests__/createHostHandle.test.ts` | createHostHandle send/request/on |
| Unit | `src/runtime/__tests__/RemoteProvider.test.tsx` | RemoteProvider + useRemote |
| Unit | `src/runtime/__tests__/RemoteComponent.test.tsx` | iframe-src URL + prop-classification + config-override + on* + mode seam + degradation |
| Unit | `src/runtime/__tests__/dualImport.test.tsx` | RemoteContext singleton API invariant |

Total: 47 unit tests. All green.

**Browser-verify (ADR 059, owner-tests, real browser — jsdom insufficient):** `apps/universal-canvas`
embeds via iframe-src, renders (not a white screen), host config-override applies, canvas→host events
flow, no redirect. Memory `feedback_verify_in_browser_dont_guess`.

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
