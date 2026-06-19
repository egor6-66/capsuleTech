---
title: @capsuletech/web-remote Phase 1 MVP — IframeTransport + Provider + Remote + useRemote (renderer use-case anchor)
status: ready
audience: owner-web-remote
last_updated: 2026-06-19
adr: docs/01-architecture/adr/015-remote-modules.md (amendment 2026-06-19 — see Phase ordering)
---

# Контекст

Пакет `@capsuletech/web-remote` (Phase 0) — type-contracts готовы (`src/interfaces.ts`), runtime пуст. ADR-015 фиксирует контракт; OWNERSHIP.md фиксирует roadmap.

Первый реальный consumer — `@capsuletech/web-renderer` как самостоятельный runtime внутри `@capsuletech/web-studio` creator-mode. Требования consumer'а:

- **CSS isolation от host'а** — рендерер не должен наследовать глобальные стили / Tailwind utilities / theme tokens студии. Иначе compositions выглядят иначе чем в prod-режиме.
- **Свой Solid root + своя event delegation** — Kobalte popover'ы (Select / Dropdown / Tooltip) и любые pointer-based примитивы должны работать без host-document-делегации (попытка через iframe + MountProvider провалилась корнево, см. revert-бриф).
- **Mode-параметризация** (studio / standalone / embed) через initial props.
- **Типизированный канал** host ↔ renderer для schema mutations, selection, lifecycle events.

**Из этих требований следует — Phase 1 transport = iframe, не local-inline.** Local-inline (`import(url)` в тот же runtime) не даёт CSS isolation и не решает event-delegation — для рендерера бесполезен. ADR-015 amendment 2026-06-19 пере-упорядочивает roadmap (см. amendment в самом ADR): iframe → Phase 1, local-inline отложен / возможно drop'нут (канон §0 — без живого consumer'а не строим).

Public type contracts (Phase 0, `src/interfaces.ts`) **не меняются** — `TransportKind` уже включает `'post-message'`, `IRemoteMessage`/`IRemoteHandle`/`IRemoteProviderProps` подходят к iframe-сценарию без правок.

> **Привязка к канону.** §0: контракт remote остаётся **general-purpose** — pluggable transport через `ITransport`. Renderer — первый consumer, валидирующий API; не определяет финальную форму API. Future transports (BroadcastChannel, socket, local-inline) встают на тот же контракт.

# Скоп

Phase 1 (по amended roadmap'у):

> **Phase 1 — IframeTransport + Provider + Remote + useRemote** — same-origin iframe с собственным Solid root внутри; postMessage канал host ↔ iframe; `<RemoteProvider>` / `<Remote>` / `useRemote()`. Demo (отдельным PR). Multi-window / cross-origin / inline — следующие фазы.

## Phase 1.a — Module entry contract (lifecycle, не Solid component)

Universal module contract — **`bootstrap(root, props, channel)`** lifecycle-функция, не Solid component. Это позволяет одному артефакту обслуживать любой transport:

- В iframe: iframe-loader вызывает `bootstrap(document.getElementById('root'), props, channel)`.
- В будущем inline-transport: web-remote вызывает `bootstrap(div, props, channel)` внутри своего Solid контейнера.
- В будущем standalone window: то же, в `window.opener`-context.

```ts
// Что remote-модуль экспортит из его entry (manifest.entry):
export interface IRemoteBootstrap<Props = Record<string, unknown>> {
  (root: HTMLElement, props: Props, channel: IRemoteChannel): IRemoteDispose;
}
export type IRemoteDispose = () => void;

// channel — symmetric local handle (от лица module'а):
export interface IRemoteChannel {
  send: (event: string, payload?: unknown) => void;
  request: <T = unknown>(event: string, payload?: unknown, timeoutMs?: number) => Promise<IRemoteResponse<T>>;
  on: (event: string, cb: (payload?: unknown) => void) => () => void;
}
```

Module-side для Solid-based remote:

```ts
// packages/web/renderer/src/standalone.ts (пример — будет в followup'е, НЕ в этом брифе)
import { render } from 'solid-js/web';
import { Renderer } from './Renderer';

export const bootstrap: IRemoteBootstrap = (root, props, channel) => {
  channel.on('schema.update', (next) => /* setSchema(next) */);
  const dispose = render(() => <Renderer schema={props.schema} onSelect={(id) => channel.send('selection.change', id)} />, root);
  return dispose;
};
```

Добавить `IRemoteBootstrap`, `IRemoteDispose`, `IRemoteChannel` в `src/interfaces.ts` — это **новые типы**, не ломающие (только additive).

## Phase 1.b — `src/transport/IframeTransport.ts`

Сидит в host-`<RemoteProvider>`. Один экземпляр на provider. Обслуживает все iframe-инстансы через единый `message`-listener.

- `kind: 'post-message'` (из `TransportKind`).
- `canReach({ name, instanceId, isStandalone, sameOrigin }) → !isStandalone && sameOrigin` (Phase 1 — same-origin only; cross-origin = Phase 2-3).
- На конструктор: `window.addEventListener('message', handler)`, парсит `event.data` как `IRemoteMessage`, валидирует `sessionId` (отбрасывает чужие), dispatch'ит подписчикам.
- `send(msg)` — резолвит iframe по `(msg.to, msg.toInstance)` через registry (см. ниже), `iframe.contentWindow.postMessage(msg, sameOriginTarget)`.
- `onMessage(cb)` — добавляет cb в local subscriber set; cb вызывается при каждом валидном `message`-event.
- `dispose()` — снимает `message` listener, чистит registry.

**Iframe registry** — internal Map<`${name}:${instanceId}`, HTMLIFrameElement> в transport'е. `<Remote>` компонент при mount регистрирует iframe (`transport.register(name, instanceId, iframeEl)`), при unmount — снимает.

## Phase 1.c — `src/runtime/iframeBootstrap.ts` (iframe-side loader)

Тонкий HTML/JS-shell, который грузится **внутрь** iframe. Web-remote **владеет** этим shell'ом (не remote-модуль) — single source of truth для bootstrap flow. Реализация:

**Подход — srcdoc-template.** `<Remote>` строит iframe `srcdoc` атрибут на mount, который содержит inline HTML + bootstrap script. Преимущества: нет отдельного хостинга bootstrap-page, нет CORS, нет лишнего HTTP round-trip; srcdoc исполняется в same-origin контексте (parent's origin) → postMessage без cross-origin handshake.

Template (упрощённо):

```html
<!DOCTYPE html>
<html>
<head>
  <link rel="stylesheet" href="${module.url}/${manifest.styles?.[0] ?? ''}" />
  <!-- ... остальные styles ... -->
</head>
<body style="margin:0">
  <div id="capsule-remote-root"></div>
  <script type="module">
    const NAME = ${JSON.stringify(name)};
    const INSTANCE_ID = ${JSON.stringify(instanceId)};
    const SESSION_ID = ${JSON.stringify(sessionId)};
    const ENTRY = ${JSON.stringify(new URL(manifest.entry, module.url).href)};

    // Channel — symmetric postMessage envelope sender + dispatcher.
    const subs = new Map(); // eventName → Set<cb>
    const pending = new Map(); // requestId → resolve
    const channel = {
      send: (eventName, payload) => window.parent.postMessage({
        from: NAME, fromInstance: INSTANCE_ID, to: '__host__', sessionId: SESSION_ID, eventName, payload,
      }, '*'),
      request: (eventName, payload, timeoutMs = 5000) => new Promise((resolve) => {
        const requestId = crypto.randomUUID();
        const t = setTimeout(() => { pending.delete(requestId); resolve({ status: 'error', error: 'timeout' }); }, timeoutMs);
        pending.set(requestId, (res) => { clearTimeout(t); resolve(res); });
        window.parent.postMessage({ from: NAME, fromInstance: INSTANCE_ID, to: '__host__', sessionId: SESSION_ID, eventName, payload, requestId }, '*');
      }),
      on: (eventName, cb) => {
        if (!subs.has(eventName)) subs.set(eventName, new Set());
        subs.get(eventName).add(cb);
        return () => subs.get(eventName)?.delete(cb);
      },
    };

    window.addEventListener('message', (e) => {
      const msg = e.data;
      if (!msg || msg.sessionId !== SESSION_ID || msg.to !== NAME || (msg.toInstance && msg.toInstance !== INSTANCE_ID)) return;
      if (msg.isResponse && msg.requestId) {
        pending.get(msg.requestId)?.({ status: msg.status, payload: msg.payload, error: msg.error });
        pending.delete(msg.requestId);
      } else {
        subs.get(msg.eventName)?.forEach((cb) => cb(msg.payload));
      }
    });

    // Initial handshake: tell host we're ready, host posts back props.
    let bootstrapped = false;
    const onReadyResponse = (e) => {
      const msg = e.data;
      if (msg?.eventName !== '__capsule_remote_props__' || msg.sessionId !== SESSION_ID) return;
      window.removeEventListener('message', onReadyResponse);
      bootstrapped = true;
      import(ENTRY).then(({ bootstrap }) => {
        if (typeof bootstrap !== 'function') {
          console.error('[capsule/remote] module entry must export bootstrap()');
          return;
        }
        bootstrap(document.getElementById('capsule-remote-root'), msg.payload, channel);
      });
    };
    window.addEventListener('message', onReadyResponse);
    window.parent.postMessage({
      from: NAME, fromInstance: INSTANCE_ID, to: '__host__', sessionId: SESSION_ID, eventName: '__capsule_remote_ready__',
    }, '*');
  </script>
</body>
</html>
```

> Builder может вынести shell в отдельный hidden helper-файл и `import.meta.glob`/`?raw`-impl'ить; главное — **shell не публикуется в public API** пакета, это runtime-internal.

**srcdoc'ом не злоупотреблять:** размер шаблона держим минимальным. Если потребности iframe-side обвязки разрастаются (HMR, error overlay) — выносим в отдельный **boot.js** который хостится с web-remote'ового vite-dev-server'а или копируется в dist host-приложения.

## Phase 1.d — `src/runtime/RemoteProvider.tsx`

```tsx
export const RemoteProvider = (props: IRemoteProviderProps) => {
  const [modules, setModules] = createStore<Record<string, IRemoteModuleConfig>>({});
  const transport = new IframeTransport();
  const sessionId = createUniqueId();

  createEffect(() => {
    const next = Object.fromEntries(props.modules.map((m) => [m.name, m]));
    setModules(reconcile(next));
  });
  onCleanup(() => transport.dispose());

  const ctx: IRemoteContext = {
    Remote: (cp) => <RemoteComponent {...cp} transport={transport} sessionId={sessionId} modules={modules} />,
    remote: (name, instanceId) => createHostHandle(name, instanceId, transport, sessionId),
    updateModule: (name, patch) => setModules(name, patch),
    modules,
  };

  return <RemoteContext.Provider value={ctx}>{props.children}</RemoteContext.Provider>;
};
```

`createHostHandle` — host-side `IRemoteHandle`: `send/request/on` через `transport`, `openStandalone` = `console.warn` + no-op (Phase 2 feature).

## Phase 1.e — `src/runtime/RemoteComponent.tsx`

```tsx
const RemoteComponent = (props: IRemoteComponentProps & { transport, sessionId, modules }) => {
  const module = () => props.modules[props.name];
  const instanceId = props.instanceId ?? createUniqueId();
  let iframeRef: HTMLIFrameElement | undefined;

  const manifest = createResource(
    () => module()?.url,
    async (url) => {
      const res = await fetch(`${url}/capsule.manifest.json`);
      return res.json() as Promise<IRemoteManifest>;
    },
  );

  const srcdoc = createMemo(() => {
    const m = module();
    const mf = manifest()[0]();
    if (!m || !mf) return undefined;
    return buildSrcdoc({ name: props.name, instanceId, sessionId: props.sessionId, module: m, manifest: mf });
  });

  // Register iframe, listen for ready, post initial props.
  createEffect(() => {
    if (!iframeRef || !srcdoc()) return;
    props.transport.register(props.name, instanceId, iframeRef);
    const onReady = (msg: IRemoteMessage) => {
      if (msg.eventName === '__capsule_remote_ready__' && msg.from === props.name && msg.fromInstance === instanceId) {
        const initialProps = { ...module()?.props, ...stripInternalProps(props) };
        props.transport.send({
          from: '__host__', fromInstance: '__host__', to: props.name, toInstance: instanceId,
          sessionId: props.sessionId, eventName: '__capsule_remote_props__', payload: initialProps,
        });
      }
    };
    const unsub = props.transport.onMessage(onReady);
    onCleanup(() => {
      unsub();
      props.transport.unregister(props.name, instanceId);
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
          style="width:100%; height:100%; border:0; display:block"
          sandbox="allow-scripts allow-same-origin"
        />
      </Match>
    </Switch>
  );
};
```

- `sandbox="allow-scripts allow-same-origin"` — нужны оба, чтобы parent.postMessage работал same-origin (без `allow-same-origin` srcdoc-iframe считается opaque-origin → нет postMessage пары).
- `srcdoc` пересчитывается реактивно — изменение `module.url` через `updateModule()` ремоунтит iframe.
- Реактивные prop-обновления (props на `<Remote>` после mount'а) **в Phase 1 не делаются автоматически** — initial props один раз на ready handshake; runtime-апдейты host'ы шлют через `useRemote().remote(name).send(...)`. Это явно задокументировать.

## Phase 1.f — `src/runtime/useRemote.ts` + barrel

```ts
export const useRemote = (): IRemoteContext => {
  const ctx = useContext(RemoteContext);
  if (!ctx) throw new Error('useRemote() must be used inside <RemoteProvider>');
  return ctx;
};
```

`src/index.ts` barrel — add runtime exports:

```ts
export type {
  IRemoteBootstrap, IRemoteChannel, IRemoteDispose,  // ← новые типы lifecycle
  IRemoteComponentProps, IRemoteContext, IRemoteHandle, IRemoteManifest,
  IRemoteMessage, IRemoteModuleConfig, IRemoteProviderProps, IRemoteResponse,
  ITransport, TransportKind,
} from './interfaces';
export { RemoteProvider } from './runtime/RemoteProvider';
export { useRemote } from './runtime/useRemote';
```

## Phase 1.g — Tests

Все в `packages/web/runtime/remote/src/**/__tests__/*.test.{ts,tsx}`:

1. **IframeTransport** (jsdom):
   - `register` + `send` — `postMessage` вызван на правильном iframe.contentWindow.
   - `onMessage` фильтрует по `sessionId` (чужие игнорируются).
   - `unregister` снимает iframe из registry.
   - Broadcast (`toInstance === undefined`) → доставляется всем подписчикам с тем же `to`.
   - `dispose` снимает `message` listener.
2. **createHostHandle** (jsdom):
   - `send`/`request`/`on` правильно конструируют envelope с `from='__host__'`.
   - `request` resolve'ит на `isResponse: true` сообщении.
   - `request` timeout'ит.
3. **buildSrcdoc** (unit, pure):
   - Шаблон содержит правильные `NAME`/`INSTANCE_ID`/`SESSION_ID`/`ENTRY`.
   - JSON.stringify escapes значения (защита от inline-XSS если в `name` чужой контент — на самом деле host-only, но дисциплина).
4. **RemoteProvider + useRemote** (jsdom):
   - `useRemote()` вне Provider'а throw'ает.
   - `modules` реактивны.
   - `updateModule('x', { url: '...' })` обновляет store.
5. **`<Remote>` mount** (jsdom):
   - Mock `fetch` для manifest.
   - Рендерит `fallback('loading')` пока manifest загружается.
   - Рендерит iframe после load, `srcdoc` содержит правильные шаблонные значения.
   - Симулируем `__capsule_remote_ready__` message от iframe (через `postMessage` в jsdom) → host шлёт `__capsule_remote_props__` обратно с правильным payload.
   - `onCleanup` снимает iframe registration.
   - Изменение `module.url` → новый srcdoc, iframe ремоунтится.

**Что НЕ покрываем unit-тестами в Phase 1:**
- Реальный `import(url)` внутри iframe — jsdom модулей нет; полноценная проверка идёт через demo-app (E2E, follow-up PR).
- CSS isolation — это property iframe'а, не наша логика; тестить нечего.

## Phase 1.h — Demo (отдельный PR, не блокирующий runtime PR)

Создать `apps/remote-demo/` через CLI (`capsule create-app`):

- Host: `<RemoteProvider modules={[{ name: 'hello', url: '/remote-hello' }]}>` + `<Remote name="hello" greeting="World" />` в Widget'е.
- Remote-модуль `apps/remote-hello/` — builds в `dist/remote/` с `capsule.manifest.json` + ESM entry, экспозит `bootstrap(root, props, channel)`. Минимальный Solid `render()` рисующий `<button>{greeting}</button>` + `channel.send('clicked', timestamp)` на click.
- Host подписывается через `useRemote().remote('hello').on('clicked', ...)`.

**Critical для use-case validation:**
- Host body красит фон **синим**, remote — **красным**. Iframe-контент красный — подтверждает CSS isolation (Tailwind utility-классы host'а не наследуются).
- Click внутри remote (`<button>`) триггерит channel.send → host получает event. Подтверждает event-delegation работает внутри iframe (это то что не работало через MountProvider-подход).
- `updateModule('hello', { url: '/remote-hello-v2' })` из host'а — iframe ремоунтится, новая версия модуля загружается. Подтверждает реактивную смену URL.

Demo — **доказательство** что MVP runtime отвечает на ключевые требования renderer use-case'а. Без demo нельзя считать Phase 1 закрытой.

## Phase 1.i — Docs

1. `packages/web/runtime/remote/OWNERSHIP.md`:
   - Status: `scaffold` → `alpha`.
   - Roadmap: Phase 1 → `[x]` (с updated формулировкой — IframeTransport, не LocalTransport).
   - Публичный API: добавить `RemoteProvider`, `useRemote`, новые types (`IRemoteBootstrap`, `IRemoteChannel`, `IRemoteDispose`).
2. `docs/01-architecture/adr/015-remote-modules.md`:
   - Apply ADR amendment 2026-06-19 (architect готовит amendment параллельно).
   - Status: `proposed` → `partially-implemented` после landing Phase 1.
3. Создать / обновить `docs/_meta/web-remote.md` (AI-anchor) — следовать `docs/_meta/OWNERSHIP-template.md` стилю, добавить секцию "Module entry contract — `bootstrap(root, props, channel)`".
4. User-guide (`docs/<...>/web-remote.md`) — **не в этом скопе**. Followup после Phase 2 (multi-window / standalone).

# Чего НЕ делать

- НЕ реализовывать BroadcastChannel / socket транспорты — Phase 2-4.
- НЕ реализовывать local-inline transport — отложен (см. ADR amendment); вернёмся при появлении consumer'а.
- НЕ делать `openStandalone` — Phase 2 (нужен `router.openInWindow` от `owner-web-router`). Phase 1 — `console.warn` + no-op.
- НЕ писать `RemoteManifestPlugin` write-side — Phase 4 (`owner-builders`). Demo-модуль публикует manifest руками (статичный JSON рядом с bundle).
- НЕ инжектить `remote` сервис в Feature через `createLogicWrapper` — Phase 5 (`owner-web-core`). Host пользуется `useRemote()` напрямую.
- НЕ менять existing `src/interfaces.ts` types ломающе — только additive (`IRemoteBootstrap`, `IRemoteChannel`, `IRemoteDispose`).
- НЕ трогать `@capsuletech/web-renderer` чтобы превратить в remote-модуль — отдельный followup, координирует architect через owner-web-renderer.
- НЕ решать DnD-через-iframe-boundary в Phase 1. Drop из палитры в `<Remote name="renderer">` — отдельный архитектурный вопрос (PointerEvent forwarding через channel или host-overlay drop-zone), не блокирующий Phase 1 acceptance.
- НЕ публиковать на Verdaccio (pkg 0.0.0, не в release-группах nx.json).

# Acceptance

- ✅ `packages/web/runtime/remote/src/interfaces.ts` — добавлены `IRemoteBootstrap`, `IRemoteChannel`, `IRemoteDispose` (additive).
- ✅ `packages/web/runtime/remote/src/transport/IframeTransport.ts` — реализован.
- ✅ `packages/web/runtime/remote/src/runtime/{RemoteProvider.tsx, useRemote.ts, RemoteComponent.tsx, iframeBootstrap.ts (или buildSrcdoc.ts), createHostHandle.ts}` — реализованы.
- ✅ `packages/web/runtime/remote/src/index.ts` — экспозит runtime + новые types.
- ✅ Unit + integration тесты — green (см. Phase 1.g).
- ✅ `pnpm --filter @capsuletech/web-remote build` + `test` + `typecheck` — green.
- ✅ `OWNERSHIP.md` status `alpha`, Phase 1 checkbox done с amended формулировкой, public API таблица обновлена.
- ✅ ADR-015 amendment 2026-06-19 — landed (architect зону); status `partially-implemented` после Phase 1.
- ✅ Demo app (`apps/remote-demo` + `apps/remote-hello`) — **отдельный PR**, валидирует CSS isolation + event delegation + reactive URL change.

# Workflow

- **Новая ветка** `feat/web-remote-phase1` от `main`.
- Commit-only, без push (gate-3 — push делает architect/user после verify).
- Conventional commits по подзадачам:
  - `feat(web-remote): add bootstrap lifecycle types (IRemoteBootstrap/Channel/Dispose)`
  - `feat(web-remote): IframeTransport with iframe-registry + postMessage envelope`
  - `feat(web-remote): RemoteProvider + useRemote + Remote component (iframe srcdoc)`
  - `test(web-remote): Phase 1 runtime coverage`
  - `docs(web-remote): mark Phase 1 done in OWNERSHIP + AI-anchor`

# Followups (НЕ в этом брифе, отдельная координация)

- **ADR-015 amendment 2026-06-19** — architect (параллельно).
- **Renderer как remote-модуль.** `@capsuletech/web-renderer` экспозит `bootstrap()` entry; build emit'ит `capsule.manifest.json`; добавляется sub-export `/standalone`. Координирует architect через owner-web-renderer.
- **Studio creator-mode переезжает на `<Remote name="renderer">`.** Координирует architect через owner-web-studio (после landing'а Phase 1 + renderer-as-remote).
- **DnD через iframe boundary.** Pointer-forwarding host → iframe через channel, или host-overlay drop-zone. Архитектурный ADR (отдельный).
- **Phase 2 — BroadcastChannel + standalone window.** Multi-window same-origin. Нужен `router.openInWindow` от owner-web-router.
- **Phase 3+ — cross-origin postMessage / socket / возврат local-inline (если найдётся consumer).** Roadmap в ADR-015 amended-секции.

# Связанное

- `docs/01-architecture/adr/015-remote-modules.md` + amendment 2026-06-19 — авторитативный design doc.
- `packages/web/runtime/remote/src/interfaces.ts` — Phase 0 type contracts (additive only).
- `packages/web/runtime/remote/OWNERSHIP.md` — owner-агент source of truth.
- `docs/_meta/briefs/web-ui-mount-provider-revert.md` — parallel revert (отказ от MountProvider workaround'а).
- memory `feedback_canon_modules_no_crutches` — §0 эталон + general-purpose контракт.
- memory `feedback_packages_adapt_to_architecture` — runtime поддерживает host-сценарии без app-escape-hatches.
- memory `project_renderer_convergence` — main UI собирается через renderer-схемы (long-term motivator).
