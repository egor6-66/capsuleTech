/**
 * RemoteComponent — mounts a remote module inside an iframe.
 *
 * Four classes of input props (ADR-053 Decision 6):
 *  - System: name, instanceId, fallback (host-side wire, not forwarded)
 *  - Config: config (merged host-side, sent via __capsule_remote_config__ envelope)
 *  - Events: /^on[A-Z]/ (auto-subscribed via transport.onMessage)
 *  - Runtime props: everything else (forwarded via __capsule_remote_props__ envelope)
 *  - children: TypeScript-level ban — NOT in IRemoteComponentProps
 *
 * The component reactively sends both envelopes on every relevant change,
 * including immediately when the shell signals ready (__capsule_remote_ready__).
 */

// boot.mjs is built as a separate Vite library entry (vite.config.mts) and
// exposed via package.json#exports './boot.js' → dist/boot.mjs. Importing
// through the subpath + ?url makes Vite resolve via package exports — NOT
// relative to import.meta.url — so RemoteComponent works the same whether
// it is loaded from src (dev, after PR #413 alias for /capsule) or from
// dist (prod). No layout assumption.
// Historical note: a previous attempt used relative `?url` on the .ts
// SOURCE (`../shell/boot.ts?url`) which returned a data:video/mp2t URL —
// Vite/esbuild treats .ts as a TS module. That regression does NOT apply
// here because the subpath points at the BUILT .mjs artifact.
import bootUrl from '@capsuletech/web-remote/boot.js?url';
import {
  createEffect,
  createMemo,
  createResource,
  createUniqueId,
  type JSX,
  Match,
  onCleanup,
  Switch,
} from 'solid-js';
import type {
  IRemoteComponentProps,
  IRemoteManifest,
  IRemoteModuleConfig,
  ITransport,
} from '../interfaces';
import { buildSrcdoc } from './buildSrcdoc';

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

export const RemoteComponent = (rawProps: IRemoteComponentInternalProps): JSX.Element => {
  // Stable instanceId: use provided or generate
  // Note: createUniqueId() is called at render time (stable per-mount)
  const instanceId = rawProps.instanceId ?? createUniqueId();
  let iframeRef: HTMLIFrameElement | undefined;

  const module = (): IRemoteModuleConfig | undefined => rawProps.modules[rawProps.name];

  // Resolve transport via canReach — array shape required even with single transport
  const transport = createMemo(
    () =>
      rawProps.transports.find((t) =>
        t.canReach({ name: rawProps.name, instanceId, isStandalone: false, sameOrigin: true }),
      ) ?? rawProps.transports[0],
  );

  // Fetch manifest from ${module.url}/capsule.manifest.json
  const [manifest] = createResource(
    () => module()?.url,
    async (url: string): Promise<IRemoteManifest> => {
      const res = await fetch(`${url}/capsule.manifest.json`);
      if (!res.ok) throw new Error(`[capsule/remote] manifest fetch failed: ${res.status} ${url}`);
      return res.json() as Promise<IRemoteManifest>;
    },
  );

  // Build srcdoc only when both module config and manifest are available
  const srcdoc = createMemo(() => {
    const m = module();
    const mf = manifest();
    if (!m || !mf) return undefined;
    const url = bootUrl as string;
    return buildSrcdoc({
      name: rawProps.name,
      instanceId,
      sessionId: rawProps.sessionId,
      module: m,
      manifest: mf,
      bootUrl: url,
      hostOrigin: window.location.origin,
    });
  });

  // ─── Ready handshake ──────────────────────────────────────────────────────
  // When the shell signals __capsule_remote_ready__, push both envelopes
  // immediately. The reactive effects below will also fire — ready handshake
  // ensures the first delivery even if effects already ran before iframe mounted.
  createEffect(() => {
    const t = transport();
    if (!t) return;
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

  // ─── Register / unregister iframe with transport ──────────────────────────
  createEffect(() => {
    const t = transport();
    if (!t || !iframeRef || !srcdoc()) return;
    // Downcast to IframeTransport shape: transport has register/unregister
    const iframeTransport = t as typeof t & {
      register: (name: string, instanceId: string, el: HTMLIFrameElement) => void;
      unregister: (name: string, instanceId: string) => void;
    };
    if (typeof iframeTransport.register === 'function') {
      iframeTransport.register(rawProps.name, instanceId, iframeRef);
      onCleanup(() => iframeTransport.unregister(rawProps.name, instanceId));
    }
  });

  // ─── Helpers ─────────────────────────────────────────────────────────────

  const sendPropsEnvelope = (t: ITransport = transport()!) => {
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

  const sendConfigEnvelope = (t: ITransport = transport()!) => {
    // Merge order (ADR-053 Decision 3): provider → module → instance
    // undefined config props are skipped by spread — does NOT clear ambient config
    const merged: Record<string, unknown> = {
      ...rawProps.providerConfig,
      ...module()?.config,
      ...(rawProps.config ?? {}),
    };
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

  // ─── Reactive props envelope ───────────────────────────────────────────────
  // Re-sends on any non-reserved prop change (Solid tracks all prop reads here)
  createEffect(() => {
    const t = transport();
    if (!t) return;
    sendPropsEnvelope(t);
  });

  // ─── Reactive config envelope ─────────────────────────────────────────────
  // Re-sends when providerConfig, module config, or instance config changes
  createEffect(() => {
    const t = transport();
    if (!t) return;
    sendConfigEnvelope(t);
  });

  // ─── Auto-subscribe on* props (ADR-053 Decision 5) ───────────────────────
  // For each prop matching /^on[A-Z]/, subscribe to the corresponding event
  // from the module. Convention: camelCase event names.
  // `online`/`onclick` do NOT match (lowercase after 'on') — safe for boolean props.
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
      <Match when={srcdoc()}>
        <iframe
          ref={(el) => {
            iframeRef = el;
          }}
          title={rawProps.name}
          srcdoc={srcdoc()}
          style="width:100%;height:100%;border:0;display:block"
          sandbox="allow-scripts allow-same-origin"
        />
      </Match>
    </Switch>
  );
};
