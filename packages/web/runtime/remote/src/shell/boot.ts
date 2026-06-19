/**
 * boot.ts — iframe-side shell.
 *
 * This file is compiled as a SEPARATE Vite entry into dist/boot.js (iife/esm
 * self-contained). It is NOT imported inline — the host injects
 * `<script type="module" src="${bootUrl}">` into the iframe srcdoc.
 *
 * Responsibilities:
 *  1. Read bootstrap params from window.__CAPSULE_REMOTE__ (injected by srcdoc).
 *  2. Subscribe to window.addEventListener('message') → dispatch by eventName.
 *  3. Hold two Solid createStore (propsStore, configStore).
 *     On __capsule_remote_props__ → setPropsStore(reconcile(payload)).
 *     On __capsule_remote_config__ → setConfigStore(reconcile(payload)).
 *  4. Build IRemoteChannel for module use.
 *  5. Build proxy-accessor objects for props and config (ADR-053 Decision 4).
 *  6. Ready handshake: send __capsule_remote_ready__, wait for both envelopes,
 *     then import(ENTRY) and call bootstrap(root, { props, config, channel }).
 *  7. Reserved namespace guard: __capsule_* → console.warn + no-op.
 *
 * ADR-053 Decision 4 — Reactive proxy-accessor inside bootstrap.
 *
 * NOTE: This file runs INSIDE the iframe. It has no access to the host document.
 * postMessage is used for all host ↔ module communication.
 */

import { createStore, reconcile } from 'solid-js/store';
import type {
  IRemoteBootstrap,
  IRemoteChannel,
  IRemoteMessage,
  IRemoteResponse,
} from '../interfaces';

// ─── Bootstrap params (injected by srcdoc) ───────────────────────────────────

interface CapsuleRemoteBootstrapParams {
  name: string;
  instanceId: string;
  sessionId: string;
  entry: string;
}

declare global {
  interface Window {
    __CAPSULE_REMOTE__: CapsuleRemoteBootstrapParams;
  }
}

const params = window.__CAPSULE_REMOTE__;
if (!params) {
  throw new Error('[capsule/remote/boot] __CAPSULE_REMOTE__ global is not set');
}

const { name, instanceId, sessionId, entry } = params;

// ─── Reactive stores for props and config ─────────────────────────────────

const [propsStore, setPropsStore] = createStore<Record<string, unknown>>({});
const [configStore, setConfigStore] = createStore<Record<string, unknown>>({});

// ─── Message dispatcher ───────────────────────────────────────────────────

type Subscriber = (payload?: unknown) => void;
const subscribers = new Map<string, Set<Subscriber>>();

const dispatch = (eventName: string, payload?: unknown) => {
  const handlers = subscribers.get(eventName);
  if (!handlers) return;
  for (const h of handlers) {
    h(payload);
  }
};

const addSubscriber = (eventName: string, cb: Subscriber): (() => void) => {
  if (!subscribers.has(eventName)) {
    subscribers.set(eventName, new Set());
  }
  subscribers.get(eventName)!.add(cb);
  return () => subscribers.get(eventName)?.delete(cb);
};

window.addEventListener('message', (event: MessageEvent) => {
  if (!event.data || typeof event.data !== 'object') return;
  const msg = event.data as IRemoteMessage;
  // Filter by sessionId
  if (msg.sessionId !== sessionId) return;
  // Filter by addressee
  if (msg.to !== name || (msg.toInstance !== undefined && msg.toInstance !== instanceId)) return;

  // Built-in envelope handlers
  if (msg.eventName === '__capsule_remote_props__') {
    setPropsStore(reconcile(msg.payload as Record<string, unknown>));
    return;
  }
  if (msg.eventName === '__capsule_remote_config__') {
    setConfigStore(reconcile(msg.payload as Record<string, unknown>));
    return;
  }

  dispatch(msg.eventName, msg.payload);
});

// ─── IRemoteChannel ──────────────────────────────────────────────────────

const RESERVED_NS = '__capsule_';

const checkReserved = (event: string): boolean => {
  if (event.startsWith(RESERVED_NS)) {
    console.warn(
      `[capsule/remote] '${event}' uses the __capsule_* reserved namespace (shell-internal envelopes). This call is a no-op.`,
    );
    return true;
  }
  return false;
};

const channel: IRemoteChannel = {
  send(event: string, payload?: unknown): void {
    if (checkReserved(event)) return;
    const msg: IRemoteMessage = {
      from: name,
      fromInstance: instanceId,
      to: '__host__',
      sessionId,
      eventName: event,
      payload,
    };
    window.parent.postMessage(msg, '*');
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

      // Responses arrive as regular messages with isResponse: true
      const handleMessage = (event2: MessageEvent) => {
        if (!event2.data || typeof event2.data !== 'object') return;
        const msg = event2.data as IRemoteMessage;
        if (msg.requestId === requestId && msg.isResponse === true) {
          window.removeEventListener('message', handleMessage);
          clearTimeout(timer);
          unsub?.();
          resolve({
            status: msg.status ?? 'success',
            payload: msg.payload as T,
            error: msg.error,
          });
        }
      };
      window.addEventListener('message', handleMessage);
      unsub = () => window.removeEventListener('message', handleMessage);

      const outMsg: IRemoteMessage = {
        from: name,
        fromInstance: instanceId,
        to: '__host__',
        sessionId,
        eventName: event,
        payload,
        requestId,
      };
      window.parent.postMessage(outMsg, '*');
    });
  },

  on(event: string, cb: (payload?: unknown) => void): () => void {
    if (checkReserved(event)) return () => {};
    return addSubscriber(event, cb);
  },
};

// ─── Proxy-accessor objects (ADR-053 Decision 4) ─────────────────────────
// Direct property access is tracked by Solid (reactive).
// Enumeration (Object.keys / spread / JSON.stringify) = snapshot-only (not reactive).

const makeProxy = (store: Record<string, unknown>): Record<string, unknown> =>
  new Proxy({} as Record<string, unknown>, {
    get(_target, key: string) {
      return store[key];
    },
    ownKeys() {
      return Object.keys(store);
    },
    getOwnPropertyDescriptor(_target, key: string) {
      if (Object.hasOwn(store, key)) {
        return { enumerable: true, configurable: true, value: store[key] };
      }
      return undefined;
    },
    has(_target, key: string) {
      return key in store;
    },
  });

const propsProxy = makeProxy(propsStore as Record<string, unknown>);
const configProxy = makeProxy(configStore as Record<string, unknown>);

// ─── Ready handshake + bootstrap ─────────────────────────────────────────

const root = document.getElementById('capsule-remote-root');
if (!root) {
  throw new Error('[capsule/remote/boot] #capsule-remote-root element not found');
}

// Track receipt of both initial envelopes before calling bootstrap.
// The main window.addEventListener handler above calls setPropsStore / setConfigStore
// for these envelopes but does NOT dispatch them to userland subscribers (early return).
// We listen at the raw message level to know when both have arrived.
let propsReceived = false;
let configReceived = false;
let bootstrapped = false;

const bootstrapModule = async () => {
  if (bootstrapped) return;
  bootstrapped = true;
  window.removeEventListener('message', initialEnvelopeHandler);

  try {
    const mod = await import(/* @vite-ignore */ entry);
    const bootstrap: IRemoteBootstrap | undefined = mod.bootstrap;
    if (typeof bootstrap !== 'function') {
      console.error(
        '[capsule/remote] module entry must export a named "bootstrap" function. ' +
          `Got: ${typeof bootstrap} from ${entry}`,
      );
      return;
    }
    bootstrap(root as HTMLElement, {
      props: propsProxy as never,
      config: configProxy as never,
      channel,
    });
  } catch (err) {
    console.error('[capsule/remote/boot] bootstrap failed:', err);
  }
};

// Listen for the two initial envelopes — once both received, bootstrap.
const initialEnvelopeHandler = (event: MessageEvent) => {
  if (!event.data || typeof event.data !== 'object') return;
  const msg = event.data as IRemoteMessage;
  if (msg.sessionId !== sessionId) return;
  if (msg.to !== name || (msg.toInstance !== undefined && msg.toInstance !== instanceId)) return;

  if (msg.eventName === '__capsule_remote_props__') {
    propsReceived = true;
  } else if (msg.eventName === '__capsule_remote_config__') {
    configReceived = true;
  }

  if (propsReceived && configReceived) {
    void bootstrapModule();
  }
};

window.addEventListener('message', initialEnvelopeHandler);

// Send ready signal to host
const readyMsg: IRemoteMessage = {
  from: name,
  fromInstance: instanceId,
  to: '__host__',
  sessionId,
  eventName: '__capsule_remote_ready__',
};
window.parent.postMessage(readyMsg, '*');
