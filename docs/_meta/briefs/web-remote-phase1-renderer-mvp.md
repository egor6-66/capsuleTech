---
title: '@capsuletech/web-remote Phase 1 MVP — IframeTransport + Provider + Remote + useRemote + two-channel contract (app-as-remote foundation)'
status: superseded
superseded_by:
  - docs/01-architecture/adr/058-web-remote-message-only-mode-by-intent.md
  - docs/_meta/briefs/adr-058-phase1-web-remote.md
audience: owner-web-remote
last_updated: 2026-06-19
adr:
  - docs/01-architecture/adr/015-remote-modules.md (amendment 2026-06-19 — phase ordering)
  - docs/01-architecture/adr/053-app-as-remote-symmetry-and-config-channel.md (consumer model — primary source of truth)
ai-anchor: docs/_meta/web-remote.md
---

> [!warning] SUPERSEDED by ADR 058 (2026-06-24)
> Этот бриф построен на `ITransport` + `canReach()`-резолвере, array-of-transports и плановых
> `BroadcastChannel`/`socket`/cross-origin фазах. [[../01-architecture/adr/058-web-remote-message-only-mode-by-intent|ADR 058]]
> отменил это: один транспорт (`post-message`/iframe), `canReach` удалён, субстрат по явному `mode`,
> прочие транспорты — YAGNI. Актуальный Phase-1-бриф — [[adr-058-phase1-web-remote]]. Документ оставлен
> как исторический контекст; не использовать как руководство.

# Контекст

Пакет `@capsuletech/web-remote` (Phase 0) — type-contracts готовы (`src/interfaces.ts`), runtime пуст. ADR-015 фиксирует транспортный контракт + pluggable transports; ADR-053 фиксирует consumer model (app-as-remote, two-channel contract, structured bootstrap). Этот бриф — **implementation roadmap для Phase 1**.

**Authoritative sources** (порядок приоритета при конфликте):

1. **ADR-053** — consumer model: bootstrap signature, two-channel contract (props vs config), reserved props classes, reactive proxy, auto-subscribe `on*`, demo validation checks. Если бриф противоречит ADR-053 — действует ADR.
2. **ADR-015 (с amendment 2026-06-19)** — транспортный контракт, phase ordering (iframe = Phase 1).
3. **`docs/_meta/web-remote.md`** — AI-anchor с quick-reference таблицами (создаётся в этом же PR).

Phase 1 = **iframe MVP + canonical consumer model + reference demo**. Без сервера, без cross-origin, без manifest-write-side, без HCA-injection. Реализует ADR-053 decisions 1-8 + 11 acceptance gates.

> **Привязка к канону.** §0: контракт remote остаётся **general-purpose** через `ITransport` + `canReach`. Renderer — первый consumer, валидирующий API; не определяет финальную форму API. Future transports (BroadcastChannel, socket, cross-origin postMessage) встают на тот же контракт.

# Скоп

## Phase 1.a — Additive types в `src/interfaces.ts`

**Только additive** — Phase 0 типы (`IRemoteModuleConfig`, `IRemoteProviderProps`, `IRemoteManifest`, `IRemoteComponentProps`, `IRemoteResponse`, `IRemoteHandle`, `IRemoteContext`, `TransportKind`, `IRemoteMessage`, `ITransport`) не меняются ломающе. Расширения:

```ts
// Lifecycle (ADR-053 Decision 2)
export interface IRemoteBootstrap<
  Props = Record<string, unknown>,
  Config = Record<string, unknown>,
> {
  (root: HTMLElement, ctx: { props: Props; config: Config; channel: IRemoteChannel }): IRemoteDispose;
}

export type IRemoteDispose = () => void;

// Symmetric module-side handle (counterpart IRemoteHandle)
export interface IRemoteChannel {
  send: (event: string, payload?: unknown) => void;
  request: <T = unknown>(event: string, payload?: unknown, timeoutMs?: number) => Promise<IRemoteResponse<T>>;
  on: (event: string, cb: (payload?: unknown) => void) => () => void;
}

// IRemoteModuleConfig — добавляется `config?`
export interface IRemoteModuleConfig {
  name: string;
  url: string;
  props?: Record<string, unknown>;
  config?: Record<string, unknown>;       // ← ADR-053 Decision 3 (ambient config)
  standaloneUrl?: string;
}

// IRemoteProviderProps — добавляется `config?`
export interface IRemoteProviderProps {
  serverUrl?: string;
  modules: IRemoteModuleConfig[];
  config?: Record<string, unknown>;       // ← ambient config provider-level default
  children?: JSX.Element;
}

// IRemoteComponentProps — добавляется `config?`, `children` бан на TS-уровне
export interface IRemoteComponentProps {
  name: string;
  instanceId?: string;
  fallback?: (status: 'loading' | 'error' | 'success') => JSX.Element;
  config?: Record<string, unknown>;       // ← per-instance config override
  // children: NEVER (ADR-053 Decision 6 — composition across frame = future ADR)
  [key: string]: unknown;
}
```

Все три новых типа экспортятся из `src/index.ts`.

## Phase 1.b — `src/transport/IframeTransport.ts`

Сидит в `RemoteProvider`. Один экземпляр на provider; обслуживает все iframe-инстансы через единый `window.addEventListener('message')` handler.

- `kind: 'post-message'`.
- `canReach({ name, instanceId, isStandalone, sameOrigin }) → !isStandalone && sameOrigin` (Phase 1 — same-origin only).
- **Iframe registry** — internal `Map<\`${name}:${instanceId}\`, HTMLIFrameElement>`. `RemoteComponent` на mount вызывает `transport.register(name, instanceId, iframeEl)`, на unmount — `transport.unregister(name, instanceId)`.
- `send(msg)` — резолвит iframe по `(msg.to, msg.toInstance)`, делает `iframe.contentWindow.postMessage(msg, '*')` (same-origin, target origin не критичен).
- `onMessage(cb)` — добавляет cb в local subscriber set. Все incoming messages фильтруются по `sessionId` (чужие игнорируются).
- `dispose()` — снимает `message` listener, чистит registry + subscribers.

## Phase 1.c — Iframe shell как **`boot.js`** dist-asset (NOT inline srcdoc)

**ADR-053 consequences-negative + Acceptance gate**: shell-логика слишком тяжела для inline-srcdoc-template (два store'а, два envelope dispatcher'а, proxy fabric, request/response pending Map, ready-handshake state, reserved-namespace guard). Phase 1 default — **отдельный dist-asset**:

- Файл `packages/web/runtime/remote/src/shell/boot.ts` → собирается в `dist/boot.js` (отдельная entry в Vite config пакета, format: `iife` или `esm` self-contained).
- Импортируется в `RemoteComponent`: `import bootUrl from '@capsuletech/web-remote/boot.js?url'` (Vite-resolved URL).
- srcdoc остаётся **коротким template'ом** с inject'ом bootstrap-параметров + `<script src="${bootUrl}">` (или inline `import(bootUrl)` для ESM-варианта).

Преимущества:
- Debuggable URL в DevTools (sources tab).
- Type-checked на build'е web-remote'а (TS).
- HMR при разработке самого shell'а.
- Cache между instance'ами (один HTTP запрос на N iframe'ов).
- Не съедает символьный budget srcdoc.

### Shell обязанности

1. Прочитать bootstrap params из window globals (injected srcdoc'ом): `NAME`, `INSTANCE_ID`, `SESSION_ID`, `ENTRY` (manifest entry URL).
2. Подписаться на `window.addEventListener('message')` → dispatch'ить по `eventName` через subscriber-Map; фильтр по `sessionId` (чужие отбрасывать) + `(to, toInstance)` (если адресовано не этому instance'у).
3. Держать `propsStore` и `configStore` через Solid `createStore`. На каждый `__capsule_remote_props__` envelope → `setPropsStore(reconcile(payload))`; аналогично для `__capsule_remote_config__`.
4. Построить `channel: IRemoteChannel`:
   - `channel.send(event, payload)` → `window.parent.postMessage({ from: NAME, fromInstance: INSTANCE_ID, to: '__host__', sessionId: SESSION_ID, eventName: event, payload }, '*')`.
   - `channel.request(event, payload, timeoutMs)` → присваивает `requestId`, ждёт `isResponse: true` message, timeout через `setTimeout`.
   - `channel.on(event, cb)` → добавляет в subscriber-Map.
   - **Reserved namespace guard**: `channel.on('__capsule_*')` / `channel.send('__capsule_*')` → `console.warn('[capsule/remote] __capsule_* namespace is reserved for shell envelopes')` + no-op.
5. Построить `propsProxy` / `configProxy` через `new Proxy({}, { get, ownKeys, getOwnPropertyDescriptor })` поверх store'ов (см. ADR-053 Decision 4 для кода).
6. Initial handshake:
   - На load: `window.parent.postMessage({ eventName: '__capsule_remote_ready__', from: NAME, fromInstance: INSTANCE_ID, sessionId: SESSION_ID }, '*')`.
   - Ждать `__capsule_remote_props__` + `__capsule_remote_config__` (host шлёт оба на ready) → setStore оба.
   - `import(ENTRY).then(({ bootstrap }) => bootstrap(root, { props: propsProxy, config: configProxy, channel }))`.
   - Если `bootstrap` отсутствует / не функция → `console.error('[capsule/remote] module entry must export named "bootstrap" function')`.

## Phase 1.d — `src/runtime/RemoteProvider.tsx`

```tsx
export const RemoteProvider = (props: IRemoteProviderProps) => {
  const [modules, setModules] = createStore<Record<string, IRemoteModuleConfig>>({});
  const transports: ITransport[] = [new IframeTransport()];  // ADR-053 Decision 8 — array shape even with single
  const sessionId = createUniqueId();

  const resolveTransport = (target: Parameters<ITransport['canReach']>[0]) =>
    transports.find((t) => t.canReach(target));

  createEffect(() => {
    const next = Object.fromEntries(props.modules.map((m) => [m.name, m]));
    setModules(reconcile(next));
  });
  onCleanup(() => transports.forEach((t) => t.dispose()));

  const ctx: IRemoteContext = {
    Remote: (cp) => <RemoteComponent {...cp}
      transports={transports}
      sessionId={sessionId}
      modules={modules}
      providerConfig={props.config}
    />,
    remote: (name, instanceId) => createHostHandle(name, instanceId, transports, resolveTransport, sessionId),
    updateModule: (name, patch) => setModules(name, patch),
    modules,
  };

  return <RemoteContext.Provider value={ctx}>{props.children}</RemoteContext.Provider>;
};
```

`createHostHandle` — host-side `IRemoteHandle`:
- `send` / `request` / `on` через `resolveTransport({ name, instanceId, isStandalone: false, sameOrigin: true }) ?? transports[0]`.
- `openStandalone(props?)` → `console.warn('[capsule/remote] openStandalone — Phase 2 feature (BroadcastChannel + standalone window not yet implemented)'); return undefined`. **NO throw** — acceptance gate.

## Phase 1.e — `src/runtime/RemoteComponent.tsx`

Различает **четыре класса входных props** (ADR-053 Decision 6 — пятый класс `children` забанен на TS-уровне):

| Class | Pattern | Action |
|---|---|---|
| **System** | `name`, `instanceId`, `fallback` + internal `transports`/`sessionId`/`modules`/`providerConfig` | host-side wire, не forward |
| **Config** | `config` | host-side merge `provider.config ⊕ modules[name].config ⊕ props.config`, шлёт `__capsule_remote_config__` |
| **Events** | `/^on[A-Z]/` (regex; `online`/`onclick` НЕ matches) | host-side `transport.onMessage` subscription, кэлл cb на match'е `(from=name, fromInstance=instanceId, eventName=propName[2].toLowerCase()+propName.slice(3))` |
| **Runtime props** | всё остальное | host-side `stripReserved(props)`, шлёт `__capsule_remote_props__` |

Skeleton:

```tsx
const RemoteComponent = (props: IRemoteComponentProps & {
  transports: ITransport[];
  sessionId: string;
  modules: Record<string, IRemoteModuleConfig>;
  providerConfig?: Record<string, unknown>;
}) => {
  const module = () => props.modules[props.name];
  const instanceId = props.instanceId ?? createUniqueId();
  let iframeRef: HTMLIFrameElement | undefined;

  const transport = createMemo(() =>
    props.transports.find((t) => t.canReach({
      name: props.name, instanceId, isStandalone: false, sameOrigin: true,
    })) ?? props.transports[0]
  );

  const manifest = createResource(
    () => module()?.url,
    async (url) => (await fetch(`${url}/capsule.manifest.json`)).json() as Promise<IRemoteManifest>,
  );

  const srcdoc = createMemo(() => {
    const m = module();
    const mf = manifest()[0]();
    if (!m || !mf) return undefined;
    return buildSrcdoc({ name: props.name, instanceId, sessionId: props.sessionId, module: m, manifest: mf });
  });

  // Register / unregister iframe
  createEffect(() => {
    if (!iframeRef || !srcdoc()) return;
    transport().register(props.name, instanceId, iframeRef);
    onCleanup(() => transport().unregister(props.name, instanceId));
  });

  // Ready handshake — on __capsule_remote_ready__ → push initial props + config envelopes
  createEffect(() => {
    const unsub = transport().onMessage((msg) => {
      if (msg.eventName !== '__capsule_remote_ready__' || msg.from !== props.name || msg.fromInstance !== instanceId) return;
      // Trigger the two reactive effects below by reading them (already running via createEffect — handshake just marks "ready").
      // Implementation: shell waits for both envelopes before calling bootstrap; host always sends both on ready.
      sendPropsEnvelope();
      sendConfigEnvelope();
    });
    onCleanup(unsub);
  });

  // Reactive props envelope
  const sendPropsEnvelope = () => {
    const runtime = stripReserved(props);
    transport().send({
      from: '__host__', fromInstance: '__host__',
      to: props.name, toInstance: instanceId,
      sessionId: props.sessionId,
      eventName: '__capsule_remote_props__', payload: runtime,
    });
  };
  createEffect(sendPropsEnvelope);  // reactive — re-sends on any non-reserved prop change

  // Reactive config envelope (merge order: provider → module → instance)
  const sendConfigEnvelope = () => {
    const merged = {
      ...props.providerConfig,
      ...module()?.config,
      ...props.config,  // undefined → spread skips, NOT clears (ADR-053 Decision 3)
    };
    transport().send({
      from: '__host__', fromInstance: '__host__',
      to: props.name, toInstance: instanceId,
      sessionId: props.sessionId,
      eventName: '__capsule_remote_config__', payload: merged,
    });
  };
  createEffect(sendConfigEnvelope);

  // Auto-subscribe on* props (ADR-053 Decision 5)
  createEffect(() => {
    const eventProps = Object.keys(props).filter((k) => /^on[A-Z]/.test(k));
    eventProps.forEach((propName) => {
      const cb = props[propName] as ((payload?: unknown) => void) | undefined;
      if (!cb) return;
      const eventName = propName[2].toLowerCase() + propName.slice(3);
      const unsub = transport().onMessage((msg) => {
        if (msg.from !== props.name || msg.fromInstance !== instanceId || msg.eventName !== eventName) return;
        cb(msg.payload);
      });
      onCleanup(unsub);
    });
  });

  return (
    <Switch>
      <Match when={manifest()[0].loading}>{props.fallback?.('loading')}</Match>
      <Match when={manifest()[0].error}>{props.fallback?.('error')}</Match>
      <Match when={srcdoc()}>
        <iframe
          ref={iframeRef}
          srcdoc={srcdoc()}
          style="width:100%;height:100%;border:0;display:block"
          sandbox="allow-scripts allow-same-origin"
        />
      </Match>
    </Switch>
  );
};

const RESERVED_KEYS = new Set(['name', 'instanceId', 'fallback', 'config', 'children']);
const stripReserved = (p: Record<string, unknown>) => {
  const out: Record<string, unknown> = {};
  for (const k of Object.keys(p)) {
    if (RESERVED_KEYS.has(k)) continue;
    if (/^on[A-Z]/.test(k)) continue;
    // also skip internal props (transports/sessionId/modules/providerConfig) — they're attached via destructuring, not passed by consumer
    if (['transports', 'sessionId', 'modules', 'providerConfig'].includes(k)) continue;
    out[k] = p[k];
  }
  return out;
};
```

**`sandbox="allow-scripts allow-same-origin"`** — оба токена нужны (без `allow-same-origin` srcdoc-iframe считается opaque-origin → postMessage не парится с parent'ом). ADR-053 risk #2: это не security boundary, документировано.

**`<Remote config={undefined}>`** ≡ отсутствие prop'а — spread skips, provider+module merge применяется. Это **не** «обнулить ambient config».

**`children` через any-cast** — runtime silent ignore (TS-ban на `IRemoteComponentProps`).

## Phase 1.f — `src/runtime/buildSrcdoc.ts`

Pure function — генерит **короткий** srcdoc template, инжектит bootstrap-параметры:

```ts
export const buildSrcdoc = (params: {
  name: string;
  instanceId: string;
  sessionId: string;
  module: IRemoteModuleConfig;
  manifest: IRemoteManifest;
  bootUrl: string;  // resolved at module-load via import bootUrl from '@capsuletech/web-remote/boot.js?url'
}) => `<!DOCTYPE html>
<html><head>
  ${(params.manifest.styles ?? []).map((s) => `<link rel="stylesheet" href="${new URL(s, params.module.url).href}">`).join('\n  ')}
</head><body style="margin:0">
  <div id="capsule-remote-root"></div>
  <script>
    window.__CAPSULE_REMOTE__ = ${JSON.stringify({
      name: params.name,
      instanceId: params.instanceId,
      sessionId: params.sessionId,
      entry: new URL(params.manifest.entry, params.module.url).href,
    })};
  </script>
  <script type="module" src="${params.bootUrl}"></script>
</body></html>`;
```

`JSON.stringify` escapes значения — защита от inline-injection если в `name` чужой контент (host-only, но дисциплина). `bootUrl` инжектится в `RemoteComponent` через Vite `?url`-resolved import.

## Phase 1.g — `src/runtime/useRemote.ts` + barrel

```ts
export const useRemote = (): IRemoteContext => {
  const ctx = useContext(RemoteContext);
  if (!ctx) throw new Error('[capsule/web-remote] useRemote() must be used inside <RemoteProvider>');
  return ctx;
};
```

`src/index.ts`:

```ts
export type {
  IRemoteBootstrap, IRemoteChannel, IRemoteDispose,
  IRemoteComponentProps, IRemoteContext, IRemoteHandle, IRemoteManifest,
  IRemoteMessage, IRemoteModuleConfig, IRemoteProviderProps, IRemoteResponse,
  ITransport, TransportKind,
} from './interfaces';
export { RemoteProvider } from './runtime/RemoteProvider';
export { useRemote } from './runtime/useRemote';
// boot.js exposed via package.json#exports: "./boot.js": "./dist/boot.js"
```

## Phase 1.h — Tests

`packages/web/runtime/remote/src/**/__tests__/*.test.{ts,tsx}`:

1. **IframeTransport** (jsdom):
   - `register` + `send` → `postMessage` вызван на правильном `iframe.contentWindow`.
   - `onMessage` фильтрует по `sessionId` (чужие игнорируются).
   - `unregister` снимает iframe.
   - Broadcast (`toInstance === undefined`) → всем подписчикам с тем же `to`.
   - `dispose` снимает `message` listener.

2. **buildSrcdoc** (pure unit):
   - Template содержит `name` / `instanceId` / `sessionId` / `entry` правильно escape'd через JSON.stringify.
   - `<link rel="stylesheet">` строится для каждого `manifest.styles[i]` с правильным base URL.
   - bootUrl инжектится как `<script type="module" src>`.

3. **createHostHandle** (jsdom):
   - `send` / `request` envelope shape — `from='__host__'`, правильные `to/toInstance/sessionId`.
   - `request` resolve'ит на `isResponse: true`.
   - `request` timeout'ит через `timeoutMs`.
   - `openStandalone` — не throw'ает, warn + undefined.

4. **RemoteProvider + useRemote** (jsdom):
   - `useRemote()` вне Provider'а throw'ает.
   - `modules` реактивен на `props.modules` мутации.
   - `updateModule('x', { url: '...' })` обновляет store.
   - `transports` — array shape, single `IframeTransport` в Phase 1 (assertion).

5. **RemoteComponent** (jsdom):
   - Mock `fetch` для manifest; mock `bootUrl`.
   - Render `fallback('loading')` пока manifest load'ится.
   - Render iframe после manifest load, `srcdoc` содержит правильные параметры.
   - **Reserved-props classification**: проверить что `name`/`instanceId`/`config`/`onX` НЕ попадают в `__capsule_remote_props__` envelope; обычные props попадают.
   - **Two envelopes on ready**: симулировать `__capsule_remote_ready__` от iframe → host шлёт `__capsule_remote_props__` + `__capsule_remote_config__`, проверить payloads.
   - **Config merge order**: `provider.config = { a: 'p' }`, `module.config = { a: 'm', b: 'm' }`, `props.config = { a: 'i' }` → envelope payload = `{ a: 'i', b: 'm' }`.
   - **`config={undefined}`** ≡ нет prop'а: envelope = `{ a: 'm', b: 'm' }` (provider+module merge).
   - **Reactive props** — изменение non-reserved prop → новый envelope.
   - **Reactive config** — изменение `props.config` или `providerConfig` → новый envelope.
   - **Auto-subscribe `onX`** — симулировать `channel.send('x', payload)` от iframe → host вызывает `onX(payload)`.
   - **`onclick`/`online` non-collision** — props `online: true` НЕ wrap'ится auto-subscribe, попадает в runtime envelope.
   - **`children` ban** — TS test (compilation error при `<Remote children={...}>`); runtime — silent ignore.
   - `onCleanup` снимает iframe registration.
   - Изменение `module.url` → новый srcdoc, iframe ремоунтится.

6. **boot.js shell** (опционально в Phase 1 — может быть E2E в demo вместо unit'ов):
   - propsProxy / configProxy reactive — Solid `createEffect` пере-fire'ится на изменение store'а через property access.
   - `channel.on('__capsule_*')` → warn + no-op.
   - `channel.send('__capsule_*')` → warn + no-op.
   - Ready handshake шлёт `__capsule_remote_ready__`, ждёт `__capsule_remote_props__` + `__capsule_remote_config__`, потом import(entry) + bootstrap.

**Что НЕ покрываем unit-тестами:**
- Реальный `import(url)` внутри iframe — jsdom не загружает modules; covered в demo (E2E real browser).
- CSS isolation — property iframe'а, не наша логика.
- DnD across iframe boundary — explicit non-feature (ADR-053 risk #3).

## Phase 1.i — Demo (отдельный PR, не блокирующий runtime PR)

**Два полноценных capsule app'а через CLI** — ADR-053 Decision 7.

### `apps/remote-host`

Создаётся через `pnpm capsule create-app remote-host`. Содержит:

- `main.tsx` → `<RemoteProvider config={{ theme: signal() }} modules={[{ name: 'hello', url: helloUrl(), config: { apiUrl: 'default' } }]}>`.
- В Widget'е:
  ```tsx
  <Remote name="hello" greeting={signal()} onClicked={(ts) => console.log('host got click at', ts)} />
  ```
- Toggle theme: `signal()` переключает `'red'` / `'green'` → проверка reactive config.
- Toggle greeting: signal переключает `'World'` / `'Universe'` → проверка reactive props.
- Кнопка «add second instance with explicit ids»:
  ```tsx
  <Remote name="hello" instanceId="a" config={{ apiUrl: 'A' }} />
  <Remote name="hello" instanceId="b" config={{ apiUrl: 'B' }} />
  ```

CSS: host body фон **синий**.

### `apps/remote-hello`

Создаётся через `pnpm capsule create-app remote-hello`. Содержит:

- `main.tsx` (standalone entry) — обычный app, рендерит контент.
- **`src/standalone.ts`** (embedded entry, новый файл) — `export const bootstrap: IRemoteBootstrap`:
  ```ts
  import { render } from 'solid-js/web';
  import { Hello } from './widgets/hello';

  export const bootstrap: IRemoteBootstrap = (root, { props, config, channel }) => {
    return render(() => <Hello greeting={props.greeting} apiUrl={config.apiUrl} onClick={() => channel.send('clicked', Date.now())} />, root);
  };
  ```
- `public/capsule.manifest.json` (написан руками, vite-plugin Phase 4 — followup):
  ```json
  {
    "name": "hello",
    "version": "0.0.0",
    "entry": "/src/standalone.ts",
    "styles": ["/src/styles.css"]
  }
  ```
  (dev: entry указывает на raw source, Vite SSR'ит; prod: путь меняется на built артефакт после `pnpm build`.)
- CSS: body фон **красный**, текст реагирует на `config.apiUrl`.
- `<Hello>` widget — отображает `props.greeting` + `config.apiUrl`, кнопка эмиттит `onClick`.

### Demo flow

- `cd apps/remote-hello && pnpm dev` → :3001 — работает как standalone app.
- `cd apps/remote-host && pnpm dev` → :3000 — содержит iframe на :3001.
- `helloUrl()` в host: `import.meta.env.DEV ? 'http://localhost:3001' : '/remote-hello'`.

### Six validation checks (ADR-053 Decision 7) — **все обязательны для acceptance**

1. ✅ **CSS isolation** — host body синий, hello iframe красный. Подтверждает изоляцию.
2. ✅ **Event delegation внутри own-root** — click `<button>` внутри hello → `channel.send('clicked', ts)` → host получает через `onClicked` prop. Подтверждает own-root + auto-subscribe `on*`.
3. ✅ **Reactive props** — переключение `greeting` signal'а на host'е → hello перерисовывается без manual `.send('greeting', ...)`. Подтверждает proxy-accessor reactivity.
4. ✅ **Reactive config + ambient channel** — переключение `theme` signal'а в `<RemoteProvider config={{ theme }}>` → hello перекрашивается. Подтверждает two-channel + provider-level config.
5. ✅ **Per-instance config** — два instance'а с **explicit `instanceId="a"/"b"`** + разный `config.apiUrl` → каждый видит свой `apiUrl`. Подтверждает merge order + per-instance override.
6. ✅ **Symmetry** — `apps/remote-hello` на :3001 без iframe — работает идентично embedded-режиму (модуло host-injected config). Подтверждает app-as-remote.

**Verify в реальном браузере** (jsdom не валидирует event delegation внутри iframe и CSS isolation). Memory `feedback_verify_in_browser_dont_guess`.

## Phase 1.j — Docs

1. **`packages/web/runtime/remote/OWNERSHIP.md`**:
   - Status: `scaffold` → `alpha`.
   - Roadmap: Phase 1 → `[x]` с amended формулировкой (IframeTransport + two-channel + ADR-053).
   - Публичный API: добавить `RemoteProvider`, `useRemote`, новые types (`IRemoteBootstrap`, `IRemoteChannel`, `IRemoteDispose`).
   - Reserved-props таблица + reserved namespace `__capsule_*`.
   - Acceptance gate про transport-array shape (страховка от single-transport hardcode).

2. **ADR-015** статус → `partially-implemented` (Phase 1 done). Amendment 2026-06-19 уже landed.

3. **`docs/_meta/web-remote.md`** AI-anchor:
   - Two-channel contract таблица.
   - Reserved props 5 classes.
   - Bootstrap signature + named-export rule.
   - Reactive tracking caveat (direct property access only — enumeration ≠ reactive).
   - Serialization boundary caveat (functions/Symbols/DOM nodes/class instances не выживают postMessage; callbacks → `on*` props канонический путь).
   - `__capsule_*` reserved namespace.
   - Phase 1a dependency-readiness checkpoints (createCapsuleApp, EmitProvider, useAppConfig override, CLI scaffolding).

4. **User-guide** (`docs/<...>/web-remote.md`) — **НЕ в этом скопе**. Followup после Phase 2 (multi-window / standalone).

# Чего НЕ делать

- НЕ реализовывать BroadcastChannel / socket / cross-origin postMessage — Phase 2-4.
- НЕ реализовывать local-inline transport — отложен (ADR-015 amendment).
- НЕ делать `openStandalone` — Phase 2. В Phase 1: `console.warn` + return `undefined` (NO throw).
- НЕ писать `RemoteManifestPlugin` write-side — Phase 4 (owner-builders). Demo-модуль пишет manifest руками.
- НЕ инжектить `remote` сервис в Feature через `createLogicWrapper` — Phase 5 (owner-web-core).
- НЕ создавать `createCapsuleApp` helper в web-core — Phase 1a (owner-web-core), demo пишет `startApp` руками per-app.
- НЕ создавать `EmitProvider` для `useEmit → channel` routing — Phase 1a. Demo-hello шлёт через прямой `channel.send`, не через `useEmit`.
- НЕ создавать `useAppConfig({ override })` API — Phase 1a (owner-web-query). Demo делает manual merge inside `startApp`.
- НЕ менять existing Phase 0 types ломающе — только additive.
- НЕ трогать `@capsuletech/web-renderer` чтобы превратить в remote-модуль — Phase 1a followup, **ЗАВИСИТ от DnD-через-iframe ADR** (ADR-053 roadmap Phase 1a).
- НЕ решать DnD через iframe boundary — это **отдельный архитектурный ADR**, эскалируется на architect.
- НЕ публиковать на Verdaccio (pkg 0.0.0, не в release-группах).
- НЕ scaffold'ить `standalone.ts` через CLI — Phase 1a (owner-cli + owner-builders). Demo пишет руками.

# Acceptance gates (мирорные ADR-053 §Phase 1 Acceptance)

- ✅ `src/interfaces.ts` — additive types `IRemoteBootstrap`, `IRemoteDispose`, `IRemoteChannel`; расширение `IRemoteModuleConfig.config?`, `IRemoteProviderProps.config?`, `IRemoteComponentProps.config?` (все `Record<string, unknown>` untyped — Phase 4 codegen даст shape).
- ✅ `RemoteProvider` принимает `config?` prop; merge order (provider → module → instance) реализован **host-side в `RemoteComponent`** и unit-протестирован. `<Remote config={undefined}>` ≡ отсутствие prop'а.
- ✅ `RemoteComponent` различает 4 класса props + `children` TS-ban; reserved name'а недопустимы как runtime props.
- ✅ `RemoteComponent` `createEffect`-шлёт `__capsule_remote_props__` и `__capsule_remote_config__` envelope'ы реактивно (включая initial на ready handshake).
- ✅ `RemoteComponent` auto-subscribe-ит `^on[A-Z]` props через `transport.onMessage`; convention — camelCase event names.
- ✅ Iframe-shell — **`boot.js` как dist-asset** (`@capsuletech/web-remote/boot.js?url`); короткий srcdoc inject'ит только bootstrap-параметры. Shell держит два Solid store'а, передаёт в `bootstrap` proxy-accessor объекты для props/config. Reserved namespace `__capsule_*` для shell-internal events (user `channel.on/send('__capsule_*')` → warn + no-op).
- ✅ `useRemote().remote(name).openStandalone({})` — НЕ throw'ает, `console.warn` + return `undefined`.
- ✅ Transports — array shape (`transports: ITransport[]`), resolved через `canReach()`, даже если в Phase 1 ровно один (`new IframeTransport()`). Single-transport hardcode запрещён.
- ✅ Six validation checks demo пройдены в **реальном браузере** (см. Phase 1.i).
- ✅ `pnpm --filter @capsuletech/web-remote build` + `test` + `typecheck` — green.
- ✅ `pnpm nx affected -t test build` — green pre-push.
- ✅ ADR-015 status переходит в `partially-implemented` после Phase 1 merge.

# Workflow

- **Ветка уже создана** — `feat/web-remote-app-as-remote-foundation` (existing, ADR-053 + amendment + brief уже закоммитчены).
- **Commit-only, без push** (gate-3 — push делает architect/user после verify). Memory `feedback_agents_commit_only_user_pushes`.
- Pre-commit hook `Direct commits to main blocked` НЕ active на этой ветке (не main).
- Если pre-commit / hook блокирует — **STOP + return state**, не делать `--no-verify` (memory `feedback_agent_hook_block_escalate`).
- Conventional commits по подзадачам:
  - `feat(web-remote): add additive types (IRemoteBootstrap/Channel/Dispose) + config? on configs`
  - `feat(web-remote): IframeTransport with iframe registry + postMessage envelope`
  - `feat(web-remote): boot.js shell with proxy-accessor stores + reserved __capsule_* namespace`
  - `feat(web-remote): RemoteProvider + useRemote + RemoteComponent (two-channel + on*-auto-subscribe + transport-array)`
  - `test(web-remote): Phase 1 runtime coverage (~25 cases per Phase 1.h)`
  - `docs(web-remote): mark Phase 1 done in OWNERSHIP + AI-anchor + ADR-015 partially-implemented`
- Demo (`apps/remote-host` + `apps/remote-hello`) — **отдельный PR** после landing'а runtime PR. Если scope раздувается — эскалировать (architect делегирует через owner-cli или сам пишет).

# Followups (НЕ в этом брифе)

- **Phase 1a backfill** (canon-полнота, не блокирует Phase 1 merge):
  - `createCapsuleApp` helper в `@capsuletech/web-core/bootstrap` subpath (owner-web-core).
  - `EmitProvider` для `useEmit → channel` routing (owner-web-core).
  - `capsule create-app` генерит `src/standalone.ts` шаблон (owner-cli + owner-builders).
  - `useAppConfig({ override })` canonical API (owner-web-query, `/app-config` subpath).
- **Renderer-as-remote landing** — ЗАВИСИТ от DnD-through-iframe решения. Эскалируется на architect. Координирует через owner-web-renderer + owner-web-studio.
- **DnD-через-iframe ADR** — отдельный архитектурный документ (pointer-forwarding via channel или host-overlay drop-zone).
- **Phase 2** — BroadcastChannel + standalone window (`router.openInWindow`, owner-web-router).
- **Phase 3+** — cross-origin postMessage, socket transport, manifest plugin (owner-builders), HCA-injection compliance (owner-web-core).
- **Optimization** — diff-shipping для envelope'ов (если метрика покажет).

# Связанное

- `docs/01-architecture/adr/053-app-as-remote-symmetry-and-config-channel.md` — **PRIMARY SOURCE OF TRUTH** для consumer model.
- `docs/01-architecture/adr/015-remote-modules.md` + amendment 2026-06-19 — транспортный контракт + phase ordering.
- `packages/web/runtime/remote/src/interfaces.ts` — Phase 0 type contracts (additive only).
- `packages/web/runtime/remote/OWNERSHIP.md` — owner-agent source of truth.
- `docs/_meta/web-remote.md` — AI-anchor (создаётся в этом же PR).
- `docs/_meta/briefs/_discussion-web-remote-phase1-2026-06-19.md` — discussion summary который привёл к ADR-053.
- `docs/_meta/briefs/_polish-adr-053-2026-06-19.md` — polish notes на ADR-053.
- `docs/_meta/briefs/web-ui-mount-provider-revert.md` — parallel revert (отказ от kit-уровня iframe workaround'а).
- memory `feedback_canon_modules_no_crutches` — §0 эталон + general-purpose контракт.
- memory `feedback_packages_adapt_to_architecture` — symmetry standalone/embedded = адаптация пакета под архитектуру app'а.
- memory `feedback_agents_commit_only_user_pushes` — gate-3 push gate.
- memory `feedback_verify_in_browser_dont_guess` — demo verify в реальном браузере.
- memory `project_renderer_convergence` — renderer-as-remote = естественное продолжение convergence.
