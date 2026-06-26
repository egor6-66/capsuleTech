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
 *  - app → host: EMBED_PROTOCOL.mountedEvent (`__capsule_app_mounted__`) once it really
 *    rendered — drops the loader overlay shown over the iframe until then.
 *  - app → host: EMBED_PROTOCOL.unloadEvent (`__capsule_app_unloading__`) at unload (t0 of a
 *    reparent/reload) — re-shows the loader immediately, before the new document loads.
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

/**
 * app→host envelopes handled by the handshake / config effects — these are NOT
 * routed to `on*` props. Contract events carry bare camelCase names, so they never
 * collide with these `__capsule_*` envelope names.
 */
const RESERVED_EVENTS = new Set<string>([
  EMBED_PROTOCOL.readyEvent,
  EMBED_PROTOCOL.mountedEvent,
  EMBED_PROTOCOL.unloadEvent,
  EMBED_PROTOCOL.configEvent,
]);

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

  // Loader-overlay gate: false until the app posts EMBED_PROTOCOL.mountedEvent (it
  // really rendered) — or, for `external` non-capsule sites, until native iframe load.
  // While !mounted() && !failed() an overlay covers the iframe to hide the boot flash.
  const [mounted, setMounted] = createSignal(false);

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
  // mountedEvent (post-render) drops the loader overlay — matched by name for the same
  // reason. Re-runs on appSrc change (new remote/session) → both gates reset → loader
  // shows again.
  createEffect(() => {
    const t = transport();
    const src = appSrc();
    if (!t || !src) return;
    setFailed(false);
    setMounted(false);
    let ready = false;
    const timer = setTimeout(() => {
      if (!ready) setFailed(true);
    }, MOUNT_TIMEOUT_MS);
    const unsub = t.onMessage((msg) => {
      if (msg.from !== rawProps.name) return;
      if (msg.eventName === EMBED_PROTOCOL.readyEvent) {
        ready = true;
        clearTimeout(timer);
        sendConfigEnvelope(t);
      } else if (msg.eventName === EMBED_PROTOCOL.mountedEvent) {
        setMounted(true);
      } else if (msg.eventName === EMBED_PROTOCOL.unloadEvent) {
        // App is unloading (t0 of a DnD reparent / reload) → re-show the loader
        // immediately; it drops again on the next mountedEvent. This catches the
        // flash at its start, before the native `load` of the new document.
        setMounted(false);
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

  // ─── Route incoming app→host events → on* props (ADR 060 D1) ─────────────────
  // One listener for every app→host event from this remote. Matched by name only:
  // the self-contained app knows only its `name` + `sessionId` from the iframe URL,
  // not the host-side instanceId, so it posts fromInstance === name; sessionId is
  // already filtered by the transport — consistent with the ready/mounted handshake.
  // Known limit: multiple instances of the same `name` are indistinguishable in the
  // app→host direction (single-instance use-cases fine; per-instance disambiguation =
  // a separate ADR when component-mode lands).
  //
  // Delivery (ADR 060 D1): app→host events land ONLY in `on<Event>` props. If the
  // matching `on<Event>` prop is provided it is called; otherwise the host is not
  // subscribed to that event and it is dropped (loose coupling — no host-HCA forward).
  // Handshake/config envelopes are filtered out via RESERVED_EVENTS.
  createEffect(() => {
    const t = transport();
    if (!t) return;
    const unsub = t.onMessage((msg) => {
      if (msg.from !== rawProps.name || RESERVED_EVENTS.has(msg.eventName)) return;
      // 'markerClick' → 'onMarkerClick' (inverse of the Phase 2 typing convention).
      const handlerName = `on${msg.eventName[0]!.toUpperCase()}${msg.eventName.slice(1)}`;
      const cb = (rawProps as Record<string, unknown>)[handlerName];
      if (typeof cb === 'function') (cb as (payload?: unknown) => void)(msg.payload);
      // no on* prop → host not subscribed → drop (loose coupling, ADR 060 D1)
    });
    onCleanup(unsub);
  });

  // Native iframe load handler — only for external (foreign) sites that don't post
  // our signals: there, `load` is the only "ready" we get. Our own apps drive the
  // loader purely via mountedEvent (drop) / unloadEvent (re-show) — a DnD reparent
  // re-show is caught at t0 by unloadEvent, so `load` no longer needs to touch it.
  const handleIframeLoad = () => {
    if (module()?.external) setMounted(true);
  };

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
      <div style="position:relative;width:100%;height:100%">
        <iframe
          ref={(el) => {
            iframeRef = el;
          }}
          title={rawProps.name}
          src={appSrc()}
          // background = theme var so the blank frame between reparent-reload and the
          // next `load` shows the theme colour, not white (ADR 059 polish 2a).
          style="width:100%;height:100%;border:0;display:block;background:var(--background)"
          onLoad={handleIframeLoad}
          // TODO (ADR 059 open question #1): cross-origin hardening — tighten sandbox
          // and postMessage targetOrigin from '*' to the known app origin.
          sandbox="allow-scripts allow-same-origin"
        />
        <Show when={!mounted()}>
          {rawProps.fallback?.('loading') ?? (
            <div
              data-capsule-remote-loading={rawProps.name}
              style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:var(--background);color:var(--primary)"
            >
              {/* SMIL-animated spinner — no CSS keyframes / Tailwind (can't assume the
                  host has `animate-spin`). Track + rotating arc, themed via CSS vars. */}
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-label="loading">
                <circle
                  cx="12"
                  cy="12"
                  r="9"
                  stroke="var(--border)"
                  stroke-width="2.5"
                  opacity="0.25"
                />
                <path
                  d="M12 3 a9 9 0 0 1 9 9"
                  stroke="currentColor"
                  stroke-width="2.5"
                  stroke-linecap="round"
                >
                  <animateTransform
                    attributeName="transform"
                    type="rotate"
                    from="0 12 12"
                    to="360 12 12"
                    dur="0.8s"
                    repeatCount="indefinite"
                  />
                </path>
              </svg>
            </div>
          )}
        </Show>
      </div>
    </Show>
  );
};
