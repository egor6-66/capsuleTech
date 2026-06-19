---
tags: [meta, web-remote, ai-context, app-as-remote]
status: documented
type: ai-anchor
audience: claude
last_updated: 2026-06-19
---

# 🤖 @capsuletech/web-remote — AI context anchor

> [!ai]
> Шпаргалка для Claude-инстансов / agent'ов. Без воды. **Authoritative sources: ADR-015 (+ amendment 2026-06-19), ADR-053.** Этот файл — quick-reference; при конфликте — ADR'ы выигрывают.

## TL;DR {#tldr}

Универсальная обёртка делающая любой capsule app подключаемым как модуль внутри другого app'а. **App не знает в каком режиме работает** — есть единый entry-контракт `bootstrap(root, { props, config, channel })`, дальше живёт как обычный app. Снаружи `<Remote name="x" prop={signal()} onEvent={cb}>` ведёт себя **точно как domain-пакет** ([ADR 041]) — реактивные props, named events вверх. Магия — на уровне remote-обёртки (host-side `<Remote>` + iframe-shell), не на уровне app.

**Транспорт Phase 1 = iframe (same-origin postMessage).** CSS isolation + own Solid root + own event delegation бесплатно. Local-inline (без iframe) отложен до появления consumer'а без CSS-конфликта (ADR-015 amendment).

## Где что лежит {#layout}

| Файл | Что |
|---|---|
| `packages/web/runtime/remote/src/interfaces.ts` | Public types (Phase 0 + Phase 1 additive). **Не менять ломающе.** |
| `packages/web/runtime/remote/src/transport/IframeTransport.ts` | Phase 1 transport. `kind: 'post-message'`. Iframe registry. |
| `packages/web/runtime/remote/src/runtime/RemoteProvider.tsx` | `<RemoteProvider config? modules>`. transport-array + resolver. |
| `packages/web/runtime/remote/src/runtime/RemoteComponent.tsx` | `<Remote name instanceId? config? on*? ...props>`. 4-class filter, two envelopes, auto-subscribe. |
| `packages/web/runtime/remote/src/runtime/useRemote.ts` | `useRemote()` hook. |
| `packages/web/runtime/remote/src/runtime/createHostHandle.ts` | Host-side `IRemoteHandle` (send/request/on/openStandalone). |
| `packages/web/runtime/remote/src/runtime/buildSrcdoc.ts` | Pure srcdoc-template builder. Inject'ит params + `<script src="${bootUrl}">`. |
| `packages/web/runtime/remote/src/shell/boot.ts` | Iframe-side shell. Builds to `dist/boot.js` separate entry. **Dist-asset, not inline.** |

## Public API {#public-api}

```ts
// Types — Phase 0 + Phase 1 additive
export type {
  IRemoteBootstrap, IRemoteDispose, IRemoteChannel,         // Phase 1 additive (ADR-053)
  IRemoteComponentProps, IRemoteContext, IRemoteHandle, IRemoteManifest,
  IRemoteMessage, IRemoteModuleConfig, IRemoteProviderProps, IRemoteResponse,
  ITransport, TransportKind,
};

// Runtime
export const RemoteProvider: (props: IRemoteProviderProps) => JSX.Element;
export const useRemote: () => IRemoteContext;
// boot.js — exposed via package.json#exports "./boot.js": "./dist/boot.js"
```

## Two-channel contract — props vs config (ADR-053 Decision 3) {#two-channel}

Host передаёт две **независимые** сущности в **двух разных envelope'ах**:

| Канал | Что | Источник | Доступ в app |
|---|---|---|---|
| **props** (`__capsule_remote_props__`) | Runtime data для конкретного mount: `schema`, `center`, `userId` | JSX-attributes `<Remote ...>` минус reserved (system/config/on*) | `bootstrap` `ctx.props.*` (Solid reactive accessor) |
| **config** (`__capsule_remote_config__`) | Ambient app config: `serverUrl`, `theme`, `locale`, feature-flags | merge: `provider.config ⊕ modules[name].config ⊕ <Remote config={...}>` | `useAppConfig()` (Phase 1a — manual merge in `startApp`; Phase 1a canonization owner-web-query) |

**Merge применяется host-side** в `RemoteComponent` `createEffect`. Module-side получает finalized snapshot, никакой merge-логики внутри iframe. `<Remote config={undefined}>` ≡ отсутствие prop'а (spread skips, провайдер+модуль применяются).

**Diffing НЕ делается в Phase 1** — каждый envelope шлёт **полный snapshot**. Phase 2+ optimization (см. ADR-053 risk #1).

## Reserved props (host-side filter contract) — 5 classes (ADR-053 Decision 6) {#reserved-props}

| Class | Pattern | Action |
|---|---|---|
| **System** | `name`, `instanceId`, `fallback` | host-side wire, NOT forwarded |
| **Config** | `config` | merge + `__capsule_remote_config__` envelope |
| **Events** | `/^on[A-Z]/` | host-side `transport.onMessage` subscription |
| **Runtime props** | всё остальное (non-reserved, non-on*) | `__capsule_remote_props__` envelope |
| **children** | `children` | **TS-level ban** — composition across frame = future ADR |

Reserved name'а **зафиксированы каноном** — consumer не может передать `<Remote name="foo" config="bar">` со смыслом «config — regular prop».

## Bootstrap signature — named export, structured context (ADR-053 Decision 2) {#bootstrap}

```ts
// Module entry MUST export named `bootstrap`:
export const bootstrap: IRemoteBootstrap<MyProps, MyConfig> = (root, { props, config, channel }) => {
  channel.on('schema.update', (next) => /* ... */);
  const dispose = render(() => <App {...props} config={config} />, root);
  return dispose;
};
```

- **Named export, не default.** `default` игнорируется shell'ом; missing `bootstrap` → console.error.
- **Structured context** — расширяется additive (например, `services` в будущем) без перетряхивания подписи.
- **`dispose` = единственный return.** Reactive updates через Solid-reactivity'у внутри (proxy-accessor).

## Reactive tracking caveat — direct property access only (ADR-053 Decision 4) {#reactivity-caveat}

Shell передаёт **Solid-proxy** объекты для props/config. Solid track'ит **только direct property access**:

| ✅ Reactive | ❌ Snapshot (non-reactive) |
|---|---|
| `props.schemaName` | `Object.keys(props)` |
| `<div title={config.theme}>` | `for (const k in props) ...` |
| `createMemo(() => config.serverUrl + '/api')` | `{ ...props }` spread |
|  | `JSON.stringify(props)` |

Для динамической итерации — явная reactive обёртка:
```ts
// ✅
createMemo(() => Object.keys(propsStore));
<For each={Object.entries(props)}>{([k, v]) => ...}</For>
```

Документировать в bootstrap-примере app'а — самый частый gotcha.

## Auto-subscribe `on*` props — symmetry с domain-пакетами (ADR-053 Decision 5) {#on-props}

```tsx
// Host:
<Remote name="hello" onSelectionChange={cb} />

// Module-side:
channel.send('selectionChange', payload);

// Host автоматически вызывает cb(payload). Боилерплейта `.on()` нет.
```

- Regex `/^on[A-Z]/` — `online`/`onclick`/`onset` (lowercase после `on`) **НЕ matches**. Безопасно иметь `online: boolean` в props.
- Convention — **camelCase** event names (совпадает с `useEmit('selectionChange', ...)` в domain-пакетах per ADR 041).
- Type-safety — `(payload: unknown) => void` до Phase 4 (manifest codegen).

## Reserved namespace `__capsule_*` (ADR-053 Decision 6) {#reserved-namespace}

Префикс зарезервирован за shell-internal envelope'ами:
- `__capsule_remote_ready__` — module → host ready handshake.
- `__capsule_remote_props__` — host → module props envelope.
- `__capsule_remote_config__` — host → module config envelope.

**User-code `channel.on('__capsule_*', ...)` / `channel.send('__capsule_*', ...)` → `console.warn` + no-op.** Защита от silent collision с shell handler'ами. В Phase 4 manifest validation проверит events-schema на этот префикс на build-time.

## Serialization boundary — structured-clone (ADR-053 risk #9) {#serialization}

`postMessage` использует structured-clone algorithm. **Survive:** примитивы, plain objects, arrays, `Date`, `RegExp`, `TypedArray`, `Map`, `Set`, `ArrayBuffer`. **НЕ survive (silent drop без warning):**
- **Функции** — `<Remote computed={() => x()}>` → `computed` теряется без следа.
- **Symbols.**
- **DOM nodes.**
- **Class instances** с приватными полями / accessor-свойствами.

**Канонический путь для callback'ов = `on*` props** (см. выше), НЕ regular props. Документировать в AI-anchor app'а / bootstrap-примере.

В Phase 4 manifest schema validation проверит props-schema на наличие unserializable types → build-time error.

## Iframe shell — `boot.js` dist-asset (NOT inline srcdoc) {#shell}

Shell слишком тяжёл для inline srcdoc:
- Два Solid `createStore` (props + config).
- Два envelope dispatcher'а + filter `(from, fromInstance, eventName)` + sessionId guard.
- Proxy fabric для props/config accessor'ов.
- Request/response pending Map с timeout'ами.
- Ready-handshake state.
- Reserved-namespace guard.

**Phase 1 default = `dist/boot.js`** (отдельная Vite entry в пакете) + Vite `?url`-resolved import в `RemoteComponent`:
```ts
import bootUrl from '@capsuletech/web-remote/boot.js?url';
```

Srcdoc остаётся **коротким** — inject'ит только bootstrap-параметры (`NAME` / `INSTANCE_ID` / `SESSION_ID` / `ENTRY`) + `<script type="module" src="${bootUrl}">`.

Преимущества: debuggable URL, type-checked TS, HMR при разработке shell'а, cache между instance'ами.

## Iframe sandbox

`<iframe sandbox="allow-scripts allow-same-origin">` — **оба токена нужны**. Без `allow-same-origin` srcdoc-iframe считается opaque-origin → `postMessage` не парится с parent'ом.

**НЕ security boundary** — iframe с этой парой видит parent cookies/localStorage. Для same-origin trusted capsule app'ов — OK; untrusted third-party — нужен stricter sandbox + cross-origin (Phase 3+).

## DnD через iframe boundary — НЕ работает (ADR-053 risk #3) {#dnd}

Pointer events не пересекают frame. Studio palette drag → renderer canvas drop **не работает** в Phase 1.

Решение — **отдельный архитектурный ADR**:
- (a) Pointer-forwarding через channel (host capture pointermove → posts iframe-relative coords → iframe synthesizes PointerEvent).
- (b) Host-overlay drop-zone (host рисует transparent overlay поверх iframe → events сериализуются → channel → iframe applies).

**Эскалируется на architect**, НЕ делегируется в owner-web-renderer. Без этого renderer-as-remote landing блокируется (creator-mode без DnD = неработающий creator).

## Phase 1a dependency-readiness checkpoints {#phase1a-deps}

| Dependency | Owner | Why blocks |
|---|---|---|
| `createCapsuleApp` helper в `@capsuletech/web-core/bootstrap` | owner-web-core | Симметрия standalone/embedded; без него второй remote-capable app получит копипасту bootstrap-обвязки → дрейф через год. |
| `EmitProvider` для `useEmit → channel` routing | owner-web-core | Без него `<Remote onClicked={cb}>` работает только с modul'ями явно вызывающими `channel.send`; HCA-app использующий канонический `useEmit('clicked', payload)` не маршрутизируется наверх. |
| `useAppConfig({ override })` canonical API | owner-web-query (`/app-config` subpath) | Phase 1 demo делает manual merge в `startApp`; canonization снимает copypasta. |
| `capsule create-app` генерит `src/standalone.ts` | owner-cli + owner-builders | Phase 1 demo пишет `standalone.ts` руками; codegen в Phase 1a. |
| DnD-через-iframe ADR | architect | Блокирует renderer-as-remote landing (Phase 1a end). |

## Roadmap по phase'ам {#roadmap}

- **Phase 0** (`PR #77`) — Skeleton + types. ✅ landed.
- **Phase 1** (this brief) — IframeTransport + Provider + Remote + useRemote + two-channel + auto-on + boot.js + demo (6 validation checks). **Current.**
- **Phase 1a backfill** — `createCapsuleApp`, `EmitProvider`, CLI scaffolding, `useAppConfig({ override })`, renderer-as-remote (depends on DnD-ADR).
- **Phase 2** — `BroadcastChannelTransport` + standalone window (`router.openInWindow`). Resolver array = 2 transports.
- **Phase 3** — cross-origin postMessage (origin checks).
- **Phase 4** — socket transport + manifest plugin (write-side + read-side codegen) + zod validation.
- **Phase 5** — HCA-injection (`remote` в Feature services) + compliance rule.

## Что НЕ делать (anti-patterns specific to this pkg) {#anti}

- НЕ менять Phase 0 `interfaces.ts` ломающе — только additive.
- НЕ `throw` в `openStandalone()` — `console.warn` + return `undefined`.
- НЕ хардкодить single transport — `transports: ITransport[]` array + `canReach()` resolver.
- НЕ inline-srcdoc shell — `boot.js` dist-asset (см. Decisions).
- НЕ ловить `children` в runtime forward'е — TS-level ban на `IRemoteComponentProps`.
- НЕ делать diff-shipping envelope'ов в Phase 1 — full snapshot OK (Phase N optimization).
- НЕ implementer DnD-через-iframe в `web-remote` — эскалация на architect.

## Связанное {#related}

- [[../01-architecture/adr/015-remote-modules]] + amendment 2026-06-19 — транспортный контракт + phase ordering.
- [[../01-architecture/adr/053-app-as-remote-symmetry-and-config-channel]] — **PRIMARY consumer model**.
- [[../01-architecture/adr/041-composition-distribution-model]] — domain-пакеты + `useEmit` (mimicked by `on*` props).
- [[../01-architecture/adr/047-frontend-architecture-zones-cycle-vendor]] — frontend zones (web-remote = runtime-zone).
- `docs/_meta/briefs/web-remote-phase1-renderer-mvp.md` — implementation brief.
- `docs/_meta/briefs/_discussion-web-remote-phase1-2026-06-19.md` — discussion that led to ADR-053.
- `docs/_meta/briefs/_polish-adr-053-2026-06-19.md` — polish notes on ADR-053.
- `packages/web/runtime/remote/OWNERSHIP.md` — owner-agent source of truth.
