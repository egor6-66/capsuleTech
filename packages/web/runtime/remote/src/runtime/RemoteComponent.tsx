/**
 * RemoteComponent — mounts a remote module. Two transport-driven paths:
 *
 *  - **IframeMount** (transport.kind ≠ 'local-shadow-dom') — Phase 1A path.
 *    srcdoc iframe + boot.ts shell + four-envelope flow
 *    (__capsule_remote_ready__, __capsule_remote_props__,
 *    __capsule_remote_config__, on* event-name).
 *
 *  - **ShadowDomMount** (transport.kind = 'local-shadow-dom') — ADR 057 Phase
 *    1B path. Native `await import(entry)` + shadow root attach + direct
 *    accessor-pass for props/config (same JS realm, no serialization). CSS
 *    isolated via shadow root; manifest.styles[] injected as <link> children.
 *
 * Selection is automatic — the resolver (`find(canReach)` over
 * `rawProps.transports`) picks the first transport that can reach the target;
 * RemoteProvider orders the array so LocalShadowDomTransport wins for
 * same-origin embedded mounts and IframeTransport handles the rest.
 *
 * **Effect placement.** Iframe-flow envelopes + on* subscriptions live at the
 * dispatcher level (not inside IframeMount) so they fire as soon as the
 * component mounts, BEFORE the manifest resource resolves — preserving the
 * existing handshake protocol (envelope-first, ready-then-resend) that
 * pre-Phase-1B tests rely on. Shadow-DOM-flow effects are gated by
 * `kind === 'local-shadow-dom'` and skip envelope traffic entirely.
 *
 * Four classes of input props (ADR-053 Decision 6):
 *  - System: name, instanceId, fallback (host-side wire, not forwarded)
 *  - Config: config (merged host-side: provider → module → instance)
 *  - Events: /^on[A-Z]/ (auto-subscribed via transport.onMessage on either path)
 *  - Runtime: everything else (envelope in iframe path, direct accessor in shadow-DOM)
 *  - children: TypeScript-level ban — NOT in IRemoteComponentProps
 */

// boot.mjs is built as a separate Vite library entry (vite.config.mts) and
// exposed via package.json#exports './boot.js' → dist/boot.mjs. Importing
// through the subpath + ?url makes Vite resolve via package exports — NOT
// relative to import.meta.url — so RemoteComponent works the same whether
// it is loaded from src (dev, after PR #413 alias for /capsule) or from
// dist (prod). No layout assumption.
import bootUrl from '@capsuletech/web-remote/boot.js?url';
import {
  createEffect,
  createMemo,
  createResource,
  createUniqueId,
  type JSX,
  Match,
  onCleanup,
  onMount,
  Show,
  Switch,
} from 'solid-js';
import { createStore, reconcile } from 'solid-js/store';
import type {
  IRemoteBootstrap,
  IRemoteChannel,
  IRemoteComponentProps,
  IRemoteDispose,
  IRemoteManifest,
  IRemoteMessage,
  IRemoteModuleConfig,
  IRemoteResponse,
  ITransport,
} from '../interfaces';
import { buildSrcdoc } from './buildSrcdoc';
import { fetchManifest } from './manifestFetcher';

/** Internal props added by RemoteProvider — not part of the public API. */
export interface IRemoteComponentInternalProps extends IRemoteComponentProps {
  transports: ITransport[];
  sessionId: string;
  modules: Record<string, IRemoteModuleConfig>;
  providerConfig?: Record<string, unknown>;
}

/** Reserved prop names — never forwarded as runtime props. */
const SYSTEM_KEYS = new Set(['name', 'instanceId', 'fallback', 'config', 'children']);
/** Internal keys injected by RemoteProvider, not consumer-visible. */
const INTERNAL_KEYS = new Set(['transports', 'sessionId', 'modules', 'providerConfig']);

/** /^on[A-Z]/ — ADR-053 Decision 5. `online`/`onclick` do NOT match. */
const EVENT_PROP_RE = /^on[A-Z]/;

/**
 * Strip all reserved and internal props, returning only the runtime props
 * that should be forwarded to the remote module.
 */
const stripReserved = (p: Record<string, unknown>): Record<string, unknown> => {
  const out: Record<string, unknown> = {};
  for (const k of Object.keys(p)) {
    if (SYSTEM_KEYS.has(k)) continue;
    if (INTERNAL_KEYS.has(k)) continue;
    if (EVENT_PROP_RE.test(k)) continue;
    out[k] = p[k];
  }
  return out;
};

const mergeConfig = (
  providerConfig: Record<string, unknown> | undefined,
  moduleConfig: Record<string, unknown> | undefined,
  instanceConfig: Record<string, unknown> | undefined,
): Record<string, unknown> => ({
  ...providerConfig,
  ...moduleConfig,
  ...(instanceConfig ?? {}),
});

// ─── Top-level dispatcher ────────────────────────────────────────────────────

export const RemoteComponent = (rawProps: IRemoteComponentInternalProps): JSX.Element => {
  const instanceId = rawProps.instanceId ?? createUniqueId();
  const module = (): IRemoteModuleConfig | undefined => rawProps.modules[rawProps.name];

  const transport = createMemo(
    () =>
      rawProps.transports.find((t) =>
        t.canReach({ name: rawProps.name, instanceId, isStandalone: false, sameOrigin: true }),
      ) ?? rawProps.transports[0],
  );

  const [manifest] = createResource(() => module()?.url, fetchManifest);

  const isShadow = (): boolean => transport()?.kind === 'local-shadow-dom';

  // ─── Iframe-flow envelopes (skipped for shadow-DOM) ──────────────────────
  // Mounted at dispatcher level so they fire before manifest resolves —
  // preserves the legacy handshake (envelopes-first → iframe boots → ready
  // signal → host resends envelopes). Shadow-DOM path bypasses this protocol
  // entirely; props/config travel as Solid accessors via direct reference.

  const sendPropsEnvelope = (t: ITransport) => {
    const runtime = stripReserved(rawProps as unknown as Record<string, unknown>);
    t.send({
      from: '__host__',
      fromInstance: '__host__',
      to: rawProps.name,
      toInstance: instanceId,
      sessionId: rawProps.sessionId,
      eventName: '__capsule_remote_props__',
      payload: runtime,
    });
  };

  const sendConfigEnvelope = (t: ITransport) => {
    const merged = mergeConfig(rawProps.providerConfig, module()?.config, rawProps.config);
    t.send({
      from: '__host__',
      fromInstance: '__host__',
      to: rawProps.name,
      toInstance: instanceId,
      sessionId: rawProps.sessionId,
      eventName: '__capsule_remote_config__',
      payload: merged,
    });
  };

  // Ready handshake — only meaningful when boot.ts shell will issue
  // __capsule_remote_ready__ (iframe path).
  createEffect(() => {
    const t = transport();
    if (!t || isShadow()) return;
    const unsub = t.onMessage((msg) => {
      if (
        msg.eventName === '__capsule_remote_ready__' &&
        msg.from === rawProps.name &&
        msg.fromInstance === instanceId
      ) {
        sendPropsEnvelope(t);
        sendConfigEnvelope(t);
      }
    });
    onCleanup(unsub);
  });

  // Reactive props/config envelopes — iframe path only.
  createEffect(() => {
    const t = transport();
    if (!t || isShadow()) return;
    sendPropsEnvelope(t);
  });
  createEffect(() => {
    const t = transport();
    if (!t || isShadow()) return;
    sendConfigEnvelope(t);
  });

  // ─── Auto-subscribe on* props (works on both paths) ──────────────────────
  // Substrate differs (postMessage vs in-realm dispatch) but the contract is
  // identical: transport.onMessage delivers messages from the module and the
  // matching prop-cb is invoked.
  createEffect(() => {
    const t = transport();
    if (!t) return;
    const eventProps = Object.keys(rawProps).filter((k) => EVENT_PROP_RE.test(k));
    for (const propName of eventProps) {
      const cb = (rawProps as Record<string, unknown>)[propName] as
        | ((payload?: unknown) => void)
        | undefined;
      if (typeof cb !== 'function') continue;
      // onSelectionChange → 'selectionChange'
      const eventName = propName[2]!.toLowerCase() + propName.slice(3);
      const unsub = t.onMessage((msg) => {
        if (
          msg.from === rawProps.name &&
          msg.fromInstance === instanceId &&
          msg.eventName === eventName
        ) {
          cb(msg.payload);
        }
      });
      onCleanup(unsub);
    }
  });

  return (
    <Switch>
      <Match when={manifest.loading}>{rawProps.fallback?.('loading')}</Match>
      <Match when={manifest.error}>{rawProps.fallback?.('error')}</Match>
      <Match when={isShadow() && manifest() && module()}>
        <ShadowDomMount
          rawProps={rawProps}
          instanceId={instanceId}
          transport={transport()!}
          manifest={manifest()!}
          moduleConfig={module()!}
        />
      </Match>
      <Match when={manifest() && module()}>
        <IframeMount
          rawProps={rawProps}
          instanceId={instanceId}
          transport={transport()!}
          manifest={manifest()!}
          moduleConfig={module()!}
        />
      </Match>
    </Switch>
  );
};

// ─── Iframe path (Phase 1A) ──────────────────────────────────────────────────

interface IMountProps {
  rawProps: IRemoteComponentInternalProps;
  instanceId: string;
  transport: ITransport;
  manifest: IRemoteManifest;
  moduleConfig: IRemoteModuleConfig;
}

const IframeMount = (props: IMountProps): JSX.Element => {
  let iframeRef: HTMLIFrameElement | undefined;

  const srcdoc = createMemo(() => {
    const url = bootUrl as string;
    return buildSrcdoc({
      name: props.rawProps.name,
      instanceId: props.instanceId,
      sessionId: props.rawProps.sessionId,
      module: props.moduleConfig,
      manifest: props.manifest,
      bootUrl: url,
      hostOrigin: window.location.origin,
    });
  });

  // Register iframe element with the transport — IframeTransport routes
  // outgoing messages via the registry. Other transports may expose register
  // too (defensive `typeof`-guard).
  createEffect(() => {
    if (!iframeRef || !srcdoc()) return;
    const iframeTransport = props.transport as ITransport & {
      register?: (name: string, instanceId: string, el: HTMLIFrameElement) => void;
      unregister?: (name: string, instanceId: string) => void;
    };
    if (typeof iframeTransport.register === 'function') {
      iframeTransport.register(props.rawProps.name, props.instanceId, iframeRef);
      onCleanup(() => iframeTransport.unregister?.(props.rawProps.name, props.instanceId));
    }
  });

  return (
    <Show when={srcdoc()}>
      <iframe
        ref={(el) => {
          iframeRef = el;
        }}
        title={props.rawProps.name}
        srcdoc={srcdoc()}
        style="width:100%;height:100%;border:0;display:block"
        sandbox="allow-scripts allow-same-origin"
      />
    </Show>
  );
};

// ─── Shadow-DOM path (ADR 057 §D3+§D4) ──────────────────────────────────────

const RESERVED_NS = '__capsule_';

/** Reactive proxy mirror of boot.ts `makeProxy` — direct read tracked by Solid. */
const makeProxy = (store: Record<string, unknown>): Record<string, unknown> =>
  new Proxy({} as Record<string, unknown>, {
    get(_t, key: string) {
      return store[key];
    },
    ownKeys() {
      return Object.keys(store);
    },
    getOwnPropertyDescriptor(_t, key: string) {
      if (Object.hasOwn(store, key)) {
        return { enumerable: true, configurable: true, value: store[key] };
      }
      return undefined;
    },
    has(_t, key: string) {
      return key in store;
    },
  });

/**
 * Module-side `IRemoteChannel` for shadow-DOM path. Mirrors boot.ts logic but
 * sends via the in-realm transport directly (no postMessage). The reserved
 * `__capsule_*` namespace guard matches boot.ts behavior (warn + no-op).
 */
const createModuleChannel = (
  transport: ITransport,
  name: string,
  instanceId: string,
  sessionId: string,
): IRemoteChannel => {
  const subscribers = new Map<string, Set<(payload?: unknown) => void>>();

  const dispose = transport.onMessage((msg) => {
    if (msg.sessionId !== sessionId) return;
    if (msg.to !== name) return;
    if (msg.toInstance !== undefined && msg.toInstance !== instanceId) return;
    if (msg.eventName.startsWith(RESERVED_NS)) return;
    const handlers = subscribers.get(msg.eventName);
    if (!handlers) return;
    for (const h of handlers) h(msg.payload);
  });
  onCleanup(dispose);

  const checkReserved = (event: string): boolean => {
    if (event.startsWith(RESERVED_NS)) {
      console.warn(
        `[capsule/remote] '${event}' uses the __capsule_* reserved namespace. This call is a no-op.`,
      );
      return true;
    }
    return false;
  };

  return {
    send(event: string, payload?: unknown): void {
      if (checkReserved(event)) return;
      transport.send({
        from: name,
        fromInstance: instanceId,
        to: '__host__',
        sessionId,
        eventName: event,
        payload,
      });
    },

    request<T = unknown>(
      event: string,
      payload?: unknown,
      timeoutMs = 5_000,
    ): Promise<IRemoteResponse<T>> {
      if (checkReserved(event)) {
        return Promise.reject(new Error(`[capsule/remote] reserved namespace: ${event}`));
      }
      return new Promise<IRemoteResponse<T>>((resolve, reject) => {
        const requestId = `req-${Math.random().toString(36).slice(2)}`;
        let unsub: (() => void) | undefined;
        const timer = setTimeout(() => {
          unsub?.();
          reject(new Error(`[capsule/remote] request '${event}' timed out after ${timeoutMs}ms`));
        }, timeoutMs);

        unsub = transport.onMessage((msg: IRemoteMessage) => {
          if (msg.requestId === requestId && msg.isResponse === true) {
            clearTimeout(timer);
            unsub?.();
            resolve({
              status: msg.status ?? 'success',
              payload: msg.payload as T,
              error: msg.error,
            });
          }
        });

        transport.send({
          from: name,
          fromInstance: instanceId,
          to: '__host__',
          sessionId,
          eventName: event,
          payload,
          requestId,
        });
      });
    },

    on(event: string, cb: (payload?: unknown) => void): () => void {
      if (checkReserved(event)) return () => {};
      let set = subscribers.get(event);
      if (!set) {
        set = new Set();
        subscribers.set(event, set);
      }
      set.add(cb);
      return () => {
        subscribers.get(event)?.delete(cb);
      };
    },
  };
};

const ShadowDomMount = (props: IMountProps): JSX.Element => {
  let containerEl: HTMLDivElement | undefined;

  const [propsStore, setPropsStore] = createStore<Record<string, unknown>>({});
  const [configStore, setConfigStore] = createStore<Record<string, unknown>>({});

  // Reactive props/config — directly populate Solid stores; no envelope flow.
  createEffect(() => {
    const runtime = stripReserved(props.rawProps as unknown as Record<string, unknown>);
    setPropsStore(reconcile(runtime));
  });
  createEffect(() => {
    const merged = mergeConfig(
      props.rawProps.providerConfig,
      props.moduleConfig.config,
      props.rawProps.config,
    );
    setConfigStore(reconcile(merged));
  });

  let dispose: IRemoteDispose | undefined;

  onMount(async () => {
    if (!containerEl) return;
    const entryUrl = new URL(props.manifest.entry, props.moduleConfig.url).href;
    let mod: { bootstrap?: IRemoteBootstrap };
    try {
      mod = (await import(/* @vite-ignore */ entryUrl)) as { bootstrap?: IRemoteBootstrap };
    } catch (err) {
      console.error(`[capsule/remote] dynamic import failed for ${entryUrl}:`, err);
      return;
    }
    const bootstrap = mod.bootstrap;
    if (typeof bootstrap !== 'function') {
      console.error(
        `[capsule/remote] module entry must export a named "bootstrap" function. Got: ${typeof bootstrap} from ${entryUrl}`,
      );
      return;
    }

    const shadow = containerEl.attachShadow({ mode: 'open' });
    for (const styleUrl of props.manifest.styles ?? []) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = new URL(styleUrl, props.moduleConfig.url).href;
      shadow.appendChild(link);
    }

    const propsProxy = makeProxy(propsStore as Record<string, unknown>);
    const configProxy = makeProxy(configStore as Record<string, unknown>);
    const channel = createModuleChannel(
      props.transport,
      props.rawProps.name,
      props.instanceId,
      props.rawProps.sessionId,
    );

    try {
      dispose = bootstrap(shadow, { props: propsProxy, config: configProxy, channel });
    } catch (err) {
      console.error('[capsule/remote] shadow-DOM bootstrap failed:', err);
    }
  });

  onCleanup(() => {
    dispose?.();
    dispose = undefined;
  });

  return (
    <div
      ref={(el) => {
        containerEl = el;
      }}
      class="capsule-remote-shadow-host"
      style="width:100%;height:100%;display:block"
    />
  );
};
