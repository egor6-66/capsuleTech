/**
 * Public type contracts for @capsuletech/web-remote.
 *
 * See ADR 015 (docs/01-architecture/adr/015-remote-modules.md) for the rationale.
 * See ADR 053 (docs/01-architecture/adr/053-app-as-remote-symmetry-and-config-channel.md)
 * for the consumer model (bootstrap signature, two-channel contract, reserved props).
 * This file is the SOURCE OF TRUTH for the API shape — runtime in subsequent
 * Phases (1..5) must implement these types unchanged.
 *
 * @module
 */

import type { JSX } from 'solid-js';

// ─────────────────────────────────────────────────────────────────────────────
// Configuration (input to <RemoteProvider>)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Single remote module entry passed into <RemoteProvider modules={[...]}>.
 */
export interface IRemoteModuleConfig {
  /** Stable name used as lookup key (`<Remote name="..." />`, `remote('...')`). */
  name: string;
  /** Origin where the module is hosted. Manifest is fetched from `${url}/capsule.manifest.json`. */
  url: string;
  /** Default props passed to every instance of this module. Per-instance props override. */
  props?: Record<string, unknown>;
  /**
   * Ambient app config for this module type (e.g. `serverUrl`, `theme`, `locale`).
   * Merged host-side: provider.config → modules[name].config → <Remote config={...}>.
   * ADR-053 Decision 3.
   */
  config?: Record<string, unknown>;
  /** Optional explicit standalone-route URL (defaults to `${url}/standalone`). */
  standaloneUrl?: string;
}

/**
 * Props for the root provider. One per app, mounted above <RouterProvider>.
 */
export interface IRemoteProviderProps {
  /**
   * Optional transport-server URL. Required only for cross-origin standalone
   * windows (after refresh, when `window.opener` is lost) and cross-device.
   * Same-origin and embedded scenarios work without it.
   */
  serverUrl?: string;
  /** List of remote modules available in this app. Reactive — can be mutated at runtime. */
  modules: IRemoteModuleConfig[];
  /**
   * Provider-level ambient config default — applies to ALL embedded modules.
   * Lowest priority in merge: provider.config → modules[name].config → <Remote config={...}>.
   * ADR-053 Decision 3.
   */
  config?: Record<string, unknown>;
  children?: JSX.Element;
}

// ─────────────────────────────────────────────────────────────────────────────
// Manifest (published by every remote module at /capsule.manifest.json)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Manifest a remote module publishes alongside its built bundle.
 * Generated at build time by RemoteManifestPlugin (vite-builder).
 *
 * ADR 057 §D2 extends Phase 0 shape with `$schema`, `exposes`, `shared` (additive).
 * `name`/`version`/`entry`/`styles?`/`props?`/`events?` preserved verbatim.
 */
export interface IRemoteManifest {
  name: string;
  version: string;
  /** Path to the ESM entry (relative to module origin). */
  entry: string;
  /** CSS files to inject as <link rel="stylesheet"> (relative to module origin). */
  styles?: string[];
  /** zod-to-json-schema serialization of the props schema. */
  props?: unknown;
  /** Map of `eventName → zod-to-json-schema(payload)`. */
  events?: Record<string, unknown>;
  /** Optional JSON-schema reference for tooling validation. ADR 057 §D2. */
  $schema?: string;
  /**
   * Exposed entry map. Phase 1 hardcodes `{ "./remote": entry }` (single entry
   * per ADR 053). Multi-expose lands in Phase 2.
   */
  exposes?: Record<string, string>;
  /**
   * Shared singleton dependencies the remote was built against. Host validates
   * version compat against its own import-map (`validateSharedCompat`).
   * ADR 057 §D2 + §D1.
   */
  shared?: Record<string, IRemoteSharedDep>;
}

/** One entry in {@link IRemoteManifest.shared}. */
export interface IRemoteSharedDep {
  version: string;
  singleton: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Component API (<Remote>)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Props of the <Remote /> component returned from useRemote().
 *
 * Reserved props (ADR-053 Decision 6):
 *  - System: `name`, `instanceId`, `fallback` — host-side wire, not forwarded.
 *  - Config: `config` — merged host-side, sent via __capsule_remote_config__ envelope.
 *  - Events: props matching /^on[A-Z]/ — auto-subscribed via transport.onMessage.
 *  - Runtime props: everything else — forwarded via __capsule_remote_props__ envelope.
 *  - children: BANNED at TypeScript level (composition across frame boundary = future ADR).
 *
 * Extra props (non-reserved, non-on*) are forwarded to the remote module via
 * __capsule_remote_props__ envelope (validated against zod schema once Phase 4 lands).
 */
export interface IRemoteComponentProps {
  /** Module name as registered in <RemoteProvider modules>. */
  name: string;
  /**
   * Stable per-instance identifier. Optional — generated via createUniqueId()
   * if omitted. Provide explicitly when you need to address the instance from
   * outside (e.g. `remote('geo', 'left')`).
   */
  instanceId?: string;
  /** Fallback shown during load / on error. */
  fallback?: (status: 'loading' | 'error' | 'success') => JSX.Element;
  /**
   * Per-instance ambient config override. Highest priority in merge:
   *   provider.config → modules[name].config → config (this prop).
   * `undefined` is equivalent to omitting the prop — does NOT clear ambient config.
   * ADR-053 Decision 3.
   */
  config?: Record<string, unknown>;
  // children: INTENTIONALLY ABSENT — composition across iframe frame boundary
  // requires a separate architectural ADR (ADR-053 Decision 6 / risk #3).
  // Runtime silently ignores children if passed via any-cast.
  /** Anything else (non-reserved, non-on*) is forwarded to the remote module. */
  [key: string]: unknown;
}

// ─────────────────────────────────────────────────────────────────────────────
// Communication API (useRemote / remote(...))
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Response from a request/response round-trip.
 */
export interface IRemoteResponse<T = unknown> {
  status: 'success' | 'error';
  payload?: T;
  error?: string;
}

/**
 * Per-module communication handle. Returned from `remote(name, instanceId?)`.
 *
 * - `send(event, payload)` — fire-and-forget, no return value
 * - `request(event, payload, timeoutMs?)` — awaitable, default 5s timeout
 * - `on(event, cb)` — subscribe, returns unsubscribe function
 * - `openStandalone(props)` — open this module in a separate window
 */
export interface IRemoteHandle {
  send: (event: string, payload?: unknown) => void;
  request: <T = unknown>(
    event: string,
    payload?: unknown,
    timeoutMs?: number,
  ) => Promise<IRemoteResponse<T>>;
  on: (event: string, cb: (payload?: unknown) => void) => () => void;
  openStandalone: (props?: Record<string, unknown>) => void;
}

/**
 * Context shape exposed via useRemote(). Includes both the <Remote> component
 * factory and runtime helpers for mutating the registry / addressing instances.
 */
export interface IRemoteContext {
  /** Component to mount a remote module by name. */
  Remote: (props: IRemoteComponentProps) => JSX.Element;
  /** Get a communication handle for a remote module. */
  remote: (name: string, instanceId?: string) => IRemoteHandle;
  /** Mutate a module entry at runtime (e.g. swap URL after receiving a "new version" notification). */
  updateModule: (name: string, patch: Partial<IRemoteModuleConfig>) => void;
  /** Currently registered modules (reactive snapshot). */
  modules: Readonly<Record<string, IRemoteModuleConfig>>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Transport layer (internal, but exported as a public contract because
// custom transports may be plugged in by consumers in Phase 3+)
// ─────────────────────────────────────────────────────────────────────────────

export type TransportKind =
  | 'local'
  | 'local-shadow-dom'
  | 'broadcast-channel'
  | 'post-message'
  | 'socket';

/**
 * Message envelope used uniformly across all transports.
 * The server-side router (Phase 3) uses `(to, toInstance, sessionId)` as the
 * routing key — `instanceId` is intentionally part of the key to support
 * multiple standalone instances of the same module per session.
 */
export interface IRemoteMessage {
  from: string;
  fromInstance: string;
  to: string;
  /** Undefined = broadcast to all instances of `to`. */
  toInstance?: string;
  sessionId: string;
  eventName: string;
  payload?: unknown;
  /** Present on request/response pairs. */
  requestId?: string;
  /** True when this message is the response to a prior request. */
  isResponse?: boolean;
  status?: 'success' | 'error';
  error?: string;
}

/**
 * Pluggable transport contract. Each transport advertises which (from, to)
 * pairs it can route; the resolver picks the lightest one available.
 */
export interface ITransport {
  kind: TransportKind;
  /** Can this transport deliver to the given target? */
  canReach: (target: {
    name: string;
    instanceId?: string;
    isStandalone: boolean;
    sameOrigin: boolean;
  }) => boolean;
  send: (msg: IRemoteMessage) => void;
  onMessage: (cb: (msg: IRemoteMessage) => void) => () => void;
  dispose: () => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Module lifecycle contract (Phase 1 additive — ADR-053 Decisions 2 + 3)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Symmetric module-side communication handle (counterpart of IRemoteHandle).
 * Passed to bootstrap() as part of the structured context object.
 *
 * Reserved namespace: event names starting with `__capsule_` are reserved for
 * shell-internal envelopes. Calling channel.on/send with such names logs a
 * console.warn and is a no-op. ADR-053 Decision 6.
 */
export interface IRemoteChannel {
  /** Fire-and-forget — module sends an event to the host. */
  send: (event: string, payload?: unknown) => void;
  /** Awaitable request/response round-trip from module to host. */
  request: <T = unknown>(
    event: string,
    payload?: unknown,
    timeoutMs?: number,
  ) => Promise<IRemoteResponse<T>>;
  /**
   * Subscribe to messages from the host (or to responses from the host).
   * Returns an unsubscribe function.
   */
  on: (event: string, cb: (payload?: unknown) => void) => () => void;
}

/**
 * Cleanup function returned from bootstrap(). Called when the remote module
 * is unmounted. Must dispose the Solid root (render() return value) and any
 * active subscriptions.
 */
export type IRemoteDispose = () => void;

/**
 * Universal lifecycle entry-point exported by every remote module.
 * Named export `bootstrap` — NOT default (default is reserved for HCA Page).
 *
 * Shell calls: bootstrap(rootElement, { props, config, channel }) on ready.
 * Props and config are Solid-reactive proxy objects — direct property access
 * is tracked by Solid; enumeration (Object.keys / spread / JSON.stringify) is
 * snapshot-only and does NOT react to future updates. ADR-053 Decision 4.
 *
 * @example
 * ```ts
 * import { render } from 'solid-js/web';
 * export const bootstrap: IRemoteBootstrap = (root, { props, config, channel }) => {
 *   return render(() => <App greeting={props.greeting} theme={config.theme} />, root);
 * };
 * ```
 *
 * The `root` is `HTMLElement` for iframe-transport mount (boot.ts inside
 * iframe) and `ShadowRoot` for local-shadow-dom transport (ADR 057 §D4).
 * Solid's `render()` accepts both — module code that only forwards `root` to
 * `render` does not need to discriminate. Additive widening of the ADR 053
 * contract introduced in Phase 1B (ADR 057).
 */
export type IRemoteBootstrap<Props = Record<string, unknown>, Config = Record<string, unknown>> = (
  root: HTMLElement | ShadowRoot,
  ctx: {
    /** Reactive accessor object for runtime props from the host. */
    props: Props;
    /** Reactive accessor object for ambient config (merged provider → module → instance). */
    config: Config;
    /** Channel for communicating back to the host. */
    channel: IRemoteChannel;
  },
) => IRemoteDispose;
