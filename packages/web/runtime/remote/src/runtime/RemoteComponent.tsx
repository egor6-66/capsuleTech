/**
 * RemoteComponent — mounts a remote module as a self-contained app in an iframe.
 *
 * app-mode (ADR 059): `<iframe src="${module.url}/?__capsule_session=…&__capsule_name=…">`.
 * The app boots itself (own solid/router) exactly like standalone — the host does NOT
 * inject a boot shell, an import-map, or share its solid realm. The only channel is
 * postMessage (ADR 058 D2). No srcdoc, no manifest fetch, no remote-entry bundle.
 *
 * Host ↔ app protocol comes from EMBED_PROTOCOL (@capsuletech/web-core/bootstrap) —
 * names are NOT hardcoded here:
 *  - app → host: EMBED_PROTOCOL.readyEvent (`__capsule_app_ready__`) once it mounts.
 *  - host → app: EMBED_PROTOCOL.configEvent (`__capsule_remote_config__`) override patch
 *    (ADR 059 D4), sent on ready and re-sent reactively when the merged config changes.
 *  - app → host: events via `on*` props (the only non-config vector — D4 removed props).
 *
 * There is NO host→app props channel — all host→app data is config (ADR 059 D4).
 * Degradation: if the app never sends ready within MOUNT_TIMEOUT_MS, render the
 * placeholder instead of the iframe (the host cannot reliably observe a cross-origin
 * iframe load failure via onerror, so this is a timeout, not an onerror handler).
 */

import { EMBED_PROTOCOL } from '@capsuletech/web-core/bootstrap';
import {
  createEffect,
  createMemo,
  createSignal,
  createUniqueId,
  type JSX,
  onCleanup,
  Show,
} from 'solid-js';
import type { IRemoteComponentProps, IRemoteModuleConfig, ITransport } from '../interfaces';

/** Internal props added by RemoteProvider — not part of the public API. */
export interface IRemoteComponentInternalProps extends IRemoteComponentProps {
  transports: ITransport[];
  sessionId: string;
  modules: Record<string, IRemoteModuleConfig>;
  providerConfig?: Record<string, unknown>;
}

/** /^on[A-Z]/ — ADR-053 Decision 5. `online`/`onclick` do NOT match. */
const EVENT_PROP_RE = /^on[A-Z]/;

/**
 * Host-side wait for the app's ready signal before declaring it unavailable.
 * Separate from web-core's app-config-wait (~1500ms) — this one is generous to
 * cover network load + app bootstrap. ADR 059 degradation path.
 */
const MOUNT_TIMEOUT_MS = 5_000;

export const RemoteComponent = (rawProps: IRemoteComponentInternalProps): JSX.Element => {
  // Execution substrate (ADR 058 D3). Read once at mount — structural, not reactive.
  // 'component' (shadow-DOM) is a reserved seam, not implemented in Phase 1: log once
  // and render the error fallback instead of throwing (a throw rips the render tree).
  const mode = rawProps.mode ?? 'app';
  if (mode === 'component') {
    console.error(
      '[capsule/remote] mode="component" (shadow-DOM) not implemented yet — ADR 058 D3. Use mode="app" (iframe).',
    );
    return rawProps.fallback?.('error') ?? null;
  }

  // Stable instanceId: use provided or generate
  // Note: createUniqueId() is called at render time (stable per-mount)
  const instanceId = rawProps.instanceId ?? createUniqueId();
  let iframeRef: HTMLIFrameElement | undefined;

  const module = (): IRemoteModuleConfig | undefined => rawProps.modules[rawProps.name];

  // Single transport (ADR 058 D2). Array shape kept in internal props — RemoteProvider
  // still passes [new IframeTransport(...)]. createMemo retained so downstream
  // transport() callers stay untouched.
  const transport = createMemo(() => rawProps.transports[0]);

  // app-mode iframe URL = app root index + identity query (ADR 059 D1, Brief 2 entry).
  // module.url is the app origin; new URL() handles trailing-slash + encoding. Keys
  // come from EMBED_PROTOCOL, never literals.
  const appSrc = createMemo<string | undefined>(() => {
    const m = module();
    if (!m) return undefined;
    const url = new URL('/', m.url);
    url.searchParams.set(EMBED_PROTOCOL.query.session, rawProps.sessionId);
    url.searchParams.set(EMBED_PROTOCOL.query.name, rawProps.name);
    return url.href;
  });

  // Unavailable when the app never sends ready within MOUNT_TIMEOUT_MS.
  const [failed, setFailed] = createSignal(false);

  // ─── Helpers ─────────────────────────────────────────────────────────────

  const sendConfigEnvelope = (t: ITransport = transport()!) => {
    // Override patch (ADR 059 D4). Merge order (ADR-053 Decision 3): provider → module
    // → instance. undefined config props are skipped by spread — does NOT clear ambient.
    const merged: Record<string, unknown> = {
      ...rawProps.providerConfig,
      ...module()?.config,
      ...(rawProps.config ?? {}),
    };
    t.send({
      from: EMBED_PROTOCOL.hostTarget,
      fromInstance: EMBED_PROTOCOL.hostTarget,
      to: rawProps.name,
      toInstance: instanceId,
      sessionId: rawProps.sessionId,
      eventName: EMBED_PROTOCOL.configEvent,
      payload: merged,
    });
  };

  // ─── Ready handshake + mount timeout ───────────────────────────────────────
  // The app posts EMBED_PROTOCOL.readyEvent (from === name; the self-contained app
  // does not know the host-side instanceId, so we match by name — sessionId is
  // already filtered by the transport). On ready: push the config override and cancel
  // the timeout. On timeout without ready: mark failed → placeholder.
  createEffect(() => {
    const t = transport();
    const src = appSrc();
    if (!t || !src) return;
    setFailed(false);
    let ready = false;
    const timer = setTimeout(() => {
      if (!ready) setFailed(true);
    }, MOUNT_TIMEOUT_MS);
    const unsub = t.onMessage((msg) => {
      if (msg.eventName === EMBED_PROTOCOL.readyEvent && msg.from === rawProps.name) {
        ready = true;
        clearTimeout(timer);
        sendConfigEnvelope(t);
      }
    });
    onCleanup(() => {
      clearTimeout(timer);
      unsub();
    });
  });

  // ─── Register / unregister iframe with transport ──────────────────────────
  // Registration lets IframeTransport.send postMessage to this iframe's contentWindow
  // (works cross-origin — postMessage does not require same-origin).
  createEffect(() => {
    const t = transport();
    if (!t || failed() || !appSrc() || !iframeRef) return;
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

  // ─── Reactive config envelope ─────────────────────────────────────────────
  // Re-sends when providerConfig, module config, or instance config changes (D4
  // runtime override). The initial delivery is the ready-handshake send above.
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
    <Show
      when={!failed() && appSrc()}
      fallback={
        <div
          data-capsule-remote-error={rawProps.name}
          style="display:flex;align-items:center;justify-content:center;width:100%;height:100%;color:#888;font:13px system-ui;padding:8px;text-align:center"
        >
          remote "{rawProps.name}" unavailable
        </div>
      }
    >
      <iframe
        ref={(el) => {
          iframeRef = el;
        }}
        title={rawProps.name}
        src={appSrc()}
        style="width:100%;height:100%;border:0;display:block"
        // TODO (ADR 059 open question #1): cross-origin hardening — tighten sandbox
        // and postMessage targetOrigin from '*' to the known app origin.
        sandbox="allow-scripts allow-same-origin"
      />
    </Show>
  );
};
