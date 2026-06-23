# Brief — Phase 1B: shadow-DOM ITransport impl `@capsuletech/web-remote` (ADR 057)

**Zone**: `owner-remote` (`packages/web/runtime/remote/`)
**Type**: feature — add new transport impl, **preserve existing API surface**
**Tree**: main shared. **НЕ создавать ветку, не коммитить.** Финальный кросс-package PR в конце epic'и.
**Depends on**: [[../../01-architecture/adr/057-web-remote-import-maps-native-esm|ADR 057]]
**Pairs with**: [[adr-057-phase1-vite-builder]] — Phase 1A **завершён**, артефакты в working tree.

---

## Цель

Добавить **`local-shadow-dom` ITransport impl** для `@capsuletech/web-remote`, который использует ADR 057 stack (import-map + native ESM + shared Solid) — закрывает multi-Solid gap из чекпойнта 2026-06-22. Iframe transport (existing `IframeTransport.ts`) сохраняется как Phase 2 path.

**Public API сохраняется как есть** (existing `interfaces.ts` — это аккумулированные ADR 053 decisions, не наброски). Меняется только internal transport mechanism + manifest extension.

---

## Pre-conditions из Phase 1A — **в working tree**

owner-vite-builder завершил Phase 1A:
- `/_shared/<pkg>@<version>/...` endpoint у каждого capsule app (dev + build)
- `<script type="importmap">` инжектится в `.capsule/index.html` (transformIndexHtml)
- `/capsule.manifest.json` — **EXTENDED existing** (added `exposes` + `shared` + `$schema`; existing `name`/`version`/`entry`/`styles?`/`props?`/`events?` сохранены)

Никаких mock'ов для integration — запустишь `pnpm capsule dev` для тестового app, и import-map / manifest endpoint уже работают.

> [!important] НЕ импортируй `SHARED_DEPS` из vite-builder
> `@capsuletech/vite-builder` — node-only build-time package, не runtime-safe для browser. Читай host's import-map напрямую из DOM. Это единственная истинно deployable surface.

---

## Public API — **preserve как есть** (existing `interfaces.ts`)

Все existing types сохраняются. Это **canon ADR 053 decisions**, не моё previous sketch:

### `IRemoteModuleConfig` (interfaces.ts:23-38) — **keep**

```ts
interface IRemoteModuleConfig {
  name: string;
  url: string;
  props?: Record<string, unknown>;          // default props per-module
  config?: Record<string, unknown>;         // ambient config per-module (ADR 053 D3)
  standaloneUrl?: string;                   // standalone window URL
}
```

### `IRemoteProviderProps` (interfaces.ts:43-62) — **keep**

```ts
interface IRemoteProviderProps {
  serverUrl?: string;                       // cross-origin/device transport server
  modules: IRemoteModuleConfig[];           // reactive
  config?: Record<string, unknown>;         // provider-level ambient config
  children?: JSX.Element;
}
```

### `IRemoteComponentProps` (interfaces.ts:88-121) — **keep**

4-class props split per ADR 053 D6 (System/Config/Events/Runtime):
- System: `name`, `instanceId?`, `fallback?` — host-side wire
- Config: `config?` — merged provider→module→view
- Events: `on[A-Z].*` — auto-subscribed
- Runtime: everything else — forwarded to remote
- `children`: TypeScript-level banned

### `IRemoteContext` (interfaces.ts:159-168) — **keep**

```ts
interface IRemoteContext {
  Remote: (props: IRemoteComponentProps) => JSX.Element;
  remote: (name: string, instanceId?: string) => IRemoteHandle;
  updateModule: (name: string, patch: Partial<IRemoteModuleConfig>) => void;
  modules: Readonly<Record<string, IRemoteModuleConfig>>;
}
```

### `IRemoteHandle` (interfaces.ts:144-153) — **keep**

```ts
interface IRemoteHandle {
  send: (event: string, payload?: unknown) => void;
  request: <T>(event: string, payload?: unknown, timeoutMs?: number) => Promise<IRemoteResponse<T>>;
  on: (event: string, cb: (payload?: unknown) => void) => () => void;
  openStandalone: (props?: Record<string, unknown>) => void;
}
```

Phase 1: `openStandalone` может остаться **существующей impl** (она работает через iframe и/или window.open независимо от shadow-DOM transport). Если упрётся в multi-Solid в standalone window — Phase 2 fix.

### `ITransport` (interfaces.ts:204-216) — **keep**

Pluggable transport contract. Существующий — keep. **Добавляешь новый impl** `local-shadow-dom` (см. Scope ниже).

### `IRemoteMessage` (interfaces.ts:183-198) — **keep**

Envelope shape сохраняется (используется ITransport.send/onMessage внутри). Для shadow-DOM транспорта payload может содержать raw Solid accessors (same realm → references передаются без serialization). Для iframe — JSON-serializable (как сейчас).

### `IRemoteManifest` — **EXTEND** (additive, per ADR 057 §D2)

```ts
interface IRemoteManifest {
  // existing — keep
  name: string;
  version: string;
  entry: string;
  styles?: string[];
  props?: unknown;          // zod-to-json-schema
  events?: Record<string, unknown>;

  // NEW (ADR 057 §D2)
  $schema?: string;
  exposes: Record<string, string>;
  shared: Record<string, { version: string; singleton: boolean }>;
}
```

Existing fields preserved. Только additive.

---

## Scope — конкретные изменения

### Файл 1 — `packages/web/runtime/remote/src/runtime/localShadowDomTransport.ts` (new)

`ITransport` impl со `kind: 'local-shadow-dom'`. In-memory message routing (Map keyed by `(to, toInstance, sessionId)` per existing `IRemoteMessage`-routing semantics).

```ts
import type { ITransport, IRemoteMessage } from '../interfaces';

export function createLocalShadowDomTransport(): ITransport {
  const listeners = new Set<(msg: IRemoteMessage) => void>();
  return {
    kind: 'local-shadow-dom',
    canReach: (target) => !target.isStandalone && target.sameOrigin,
    send(msg) {
      // Direct in-memory dispatch — same realm, no postMessage, no JSON serialize.
      // msg.payload may contain raw Solid accessors / objects by reference.
      queueMicrotask(() => listeners.forEach((fn) => fn(msg)));
    },
    onMessage(cb) {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    dispose() {
      listeners.clear();
    },
  };
}
```

Семантика request/response (correlationId, timeout) реализуется на **higher layer** через existing `createHostHandle.ts` — оно использует `ITransport.send/onMessage` и не различает iframe vs in-memory. Если existing createHostHandle делает JSON.stringify на payload — добавь branch по `transport.kind === 'local-shadow-dom'` чтобы пропускать serialization (или вообще убрать JSON, если на transport-уровне доставка raw).

### Файл 2 — `packages/web/runtime/remote/src/runtime/manifestFetcher.ts` (extend existing)

Existing fetcher `/capsule.manifest.json` (per memory `project_remote_manifest_phase1a`). Add reading новых полей:

```ts
export async function fetchManifest(remoteUrl: string): Promise<IRemoteManifest> {
  // existing path
  const url = `${remoteUrl}/capsule.manifest.json`;
  // parse + validate shape including NEW fields (exposes, shared, $schema)
}
```

Добавь validation на новые поля + helper:

```ts
export function readHostImportMap(): { imports: Record<string, string> } {
  const tag = document.querySelector('script[type="importmap"]');
  if (!tag?.textContent) return { imports: {} };
  try { return JSON.parse(tag.textContent); } catch { return { imports: {} }; }
}

export function parseSharedUrl(url: string): { pkg: string; version: string } | null {
  // /_shared/<pkg>@<version>/<rest> или /_shared/@scope/<pkg>@<version>/<rest>
  // Handles @-scoped names
}

export function validateSharedCompat(
  remoteShared: Record<string, { version: string }>,
  hostImports: Record<string, string>,
): void {
  // Phase 1 strict equality. Throws с понятным сообщением (pkg, host vs remote).
}
```

### Файл 3 — `RemoteView.tsx` (modify, не rewrite)

Existing `RemoteView` уже рендерит iframe. Modify:

1. Resolve transport через existing `ITransport.canReach`-based selection (shadow-DOM выигрывает для same-origin non-standalone, iframe — fallback). **Не добавляй `isolation` prop в public API** — auto-resolve, symmetric с existing pluggable transport pattern.
2. Default path (shadow-DOM transport selected) — mount remote через native ESM:

```tsx
// Pseudocode для shadow-DOM path (default):
onMount(async () => {
  const manifest = ctx.manifests[name];           // already fetched by Provider
  const remoteUrl = ctx.modules[name].url;
  const entry = manifest.entry;                   // hash filename из Phase 1A
  const mod = await import(/* @vite-ignore */ `${remoteUrl}${entry}`);
  const bootstrap = mod.bootstrap as IRemoteBootstrap;

  // Shadow root для CSS isolation
  const shadow = containerEl.attachShadow({ mode: 'open' });

  // Inject styles из manifest.styles[] если есть (ADR 053 D6 style isolation)
  for (const styleUrl of manifest.styles ?? []) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = `${remoteUrl}${styleUrl}`;
    shadow.appendChild(link);
  }

  // Bootstrap получает root + ctx (props/config/channel per ADR 053)
  await bootstrap(shadow, {
    props: mergedProps,    // raw Solid accessors (same realm, no serialize)
    config: mergedConfig,
    channel,               // в shadow-DOM transport-backed channel
  });
});
```

Iframe path (existing IframeTransport) — keep, активируется автоматически через `canReach` resolver когда shadow-DOM transport не подходит (cross-origin, standalone window). Phase 1 не обязателен полный refactor; если **сейчас уже работает** — просто preserve, не сломай.

### Файл 4 — `RemoteProvider.tsx` (modify)

Existing Provider — keep большинство logic'и. Modify:

1. Fetch manifests при mount (existing) — extended read для новых полей.
2. **Validate shared compat** против host import-map при каждом manifest fetch:
   ```ts
   const hostMap = readHostImportMap();
   for (const manifest of fetchedManifests) {
     validateSharedCompat(manifest.shared, hostMap.imports);
   }
   ```
3. Transport selection — резолверу add `local-shadow-dom` impl в pool transports.

### Файл 5 — `interfaces.ts` (modify — additive)

Extend `IRemoteManifest` с `$schema?`, `exposes`, `shared` (NEW fields per ADR 057 §D2). Existing fields сохраняются.

Extend `TransportKind` union (line 175):
```ts
export type TransportKind = 'local' | 'local-shadow-dom' | 'broadcast-channel' | 'post-message' | 'socket';
```

`'local'` существующий keep — это in-page same-window (если используется). `'local-shadow-dom'` новый — same realm + shadow root isolation.

### Тесты

- **Не purge'и existing tests.** Public API не меняется → existing tests должны pass без модификаций (props shape, merge order, instanceId multiplexing, fallback states). Если какие-то тесты genuinely тестируют internal iframe-impl (а не API) — flag architect, обсудим case-by-case.
- **Add new tests** для:
  - `localShadowDomTransport.ts` — `canReach`, `send/onMessage` через ITransport contract
  - `manifestFetcher.ts` — `readHostImportMap`, `parseSharedUrl`, `validateSharedCompat` (happy + mismatch + missing scenarios)
  - `RemoteView` integration — shadow-DOM mount path рендерит и mount'ит bootstrap (mock manifest + mock dynamic import)

E2E real-environment — после Phase 1B closed, делает architect (`pnpm capsule dev` playground + universal-canvas, browser check на multi-Solid + reactive props).

---

## Что keep / что delete из existing

**KEEP (Phase 1 не трогает):**
- `IframeTransport.ts` + 9 тестов — iframe path, Phase 2 продолжит работу
- `./boot.js` subpath (iframe shell entry)
- `./capsule` subpath singleton invariant (tsconfig.base.json alias, инцидент 2026-06-22) — ADR-level, не transport concern
- existing envelope flow (`__capsule_remote_props__`, postMessage handlers) внутри `IframeTransport.ts` — нужен iframe path
- `createHostHandle.ts` — оно agnostic к transport, через `ITransport.send/onMessage` API
- `RemoteContext`, `useRemote.ts`, existing public API exports — все
- 25+ existing tests (RemoteProvider.test.tsx, RemoteComponent.test.tsx) — preserve

**DELETE / REPLACE (только если genuinely impl, не API):**
- `window.parent.solidJS` shim hack для multi-Solid workaround (если есть на default code path) — больше не нужен на shadow-DOM, shared Solid через import-map
- Hardcoded iframe-only paths где должна быть transport pluggability — replace через `ITransport` resolution

Если на границе keep/delete — flag architect, обсудим case-by-case. Не догадывайся.

---

## Acceptance — что должно работать после Phase 1B

Architect прогоняет в реальном environment'е:

1. Оба apps запущены через capsule CLI: `apps/playground` (host, :3050) + `apps/universal-canvas` (remote, :3000)
2. Host page содержит `<script type="importmap">` с shared Solid URLs (Phase 1A artifact)
3. `<Remote.Provider>` в playground при mount:
   - Fetched `http://localhost:3000/capsule.manifest.json` — got extended manifest (с exposes, shared)
   - `validateSharedCompat` passed (versions match host's import-map)
4. `<Remote.View name="universal-canvas">` (transport auto-resolved → shadow-DOM):
   - Native `import(...)` succeeded по `manifest.entry`
   - Resolved bootstrap, mounted в shadow root
   - `manifest.styles?` инжектнуты в shadow root
5. **Browser console**: нет Error 2 (`use`/`setStyleProperty`), нет multi-Solid warning'ов
6. **Reactive prop test**: host setSignal → effect в remote re-runs (как в POC шага 0.5)
7. **Event test**: remote `channel.send('foo', ...)` → host's `<Remote.View onFoo={...}>` callback вызывается (4-class events per ADR 053 D6)
8. **Existing tests pass** — public API не менялась

---

## Что НЕ входит в Phase 1B

- Full iframe transport refactor — Phase 2 (existing iframe path сохраняется как fallback через `canReach` resolver, должен **продолжать работать** если работал)
- Force-isolation prop (user хочет iframe even when shadow-DOM подходит, e.g. для testing) — Phase 2 concern
- Multi-expose support — Phase 2 (Phase 1 manifest exposes hardcoded к `{ "./remote": entry }`)
- Version negotiation / semver compat — Phase 2 (strict equality в Phase 1)
- `openStandalone` polish для multi-Solid в standalone window — если в Phase 1 работает существующая impl, keep
- Cross-app Controller/Feature messaging — отдельная ADR territory
- Production CDN paths — deployment concern

---

## Coordination с owner-vite-builder

- **`SHARED_DEPS` const — НЕ импортируй из vite-builder** (node-only build-time). Читай host's import-map из DOM (`readHostImportMap()`). DOM — actual deployable source of truth.
- **Manifest schema** — extends per ADR 057 §D2. Любые расширения формата — coordinate через architect.
- Phase 1A artifacts уже в working tree, integration immediate.

---

## OWNERSHIP

`packages/web/runtime/remote/OWNERSHIP.md` обнови:
- Public API: **same** (existing types preserved per Phase 1B canon)
- Internals: новая секция "Transport (ADR 057)" — описание `local-shadow-dom` impl + manifest extension + import-map validation
- Known issues: удали multi-Solid из known gaps (закрыто Phase 1A+1B)
- Roadmap: добавь "Phase 2 — iframe transport polish, multi-expose, semver compat, standalone window multi-Solid"

---

## Git workflow

- **НЕ создавай ветку. НЕ коммитить.** Working tree only. Pre-commit hook on main намеренно блокирует (canon user'а). Не --no-verify, не switch -c.
- Architect создаёт feature branch + commits в конце epic'и. Suggested messages (architect использует, не делай сейчас):
  - `feat(remote): add local-shadow-dom ITransport (ADR 057)`
  - `feat(remote): extend IRemoteManifest with exposes/shared/$schema`
  - `feat(remote): validateSharedCompat via host import-map`
  - `test(remote): local-shadow-dom transport + manifest extension tests`
  - `docs(remote): update OWNERSHIP for ADR 057 Phase 1B`
- Если staged + tried commit → `git reset` (working tree сохранится).

---

## Эскалация

- `IRemoteBootstrap` контракт (из ADR 053) не support'ит shadow-root как mount target — flag architect, я amend ADR 053
- Existing iframe path сломался от твоих изменений в shared code (interfaces, RemoteView, RemoteProvider) — STOP, обсудим, не fix'ить на глаз
- Existing tests упали → genuinely API break или impl test? Flag architect с примером
- На границе keep/delete — flag, не догадывайся

---

## Связано

- [[../../01-architecture/adr/057-web-remote-import-maps-native-esm|ADR 057]] — direction canon
- [[../../01-architecture/adr/053-app-as-remote-symmetry-and-config-channel|ADR 053]] — IRemoteBootstrap, 4-class props split, ambient config merge order
- [[../../01-architecture/adr/015-remote-modules|ADR 015]] — оригинальный контракт
- [[adr-057-phase1-vite-builder]] — pair brief (write-side, завершён)
- [[../../01-architecture/adr/056-web-remote-mf2-iframe-transport-hybrid|ADR 056]] — superseded
