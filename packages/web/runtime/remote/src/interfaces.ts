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
// CapsuleRemotes is DECLARED in the public barrel ('./index') — the module that a
// consumer augments as `declare module '@capsuletech/web-remote'`. Reading it from
// the same public point (not re-declaring here) is what makes augment → reader →
// consumer point at ONE merged symbol across the package boundary (ADR 060 D6 fix;
// TanStack Router `Register` pattern). A type-only import → no runtime cycle.
import type { CapsuleRemotes } from './index';

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
  /**
   * Third-party site (NOT a Capsule app). Such a site never posts
   * `__capsule_app_mounted__`, so the loader overlay is removed on the native
   * iframe `load` event instead of on `EMBED_PROTOCOL.mountedEvent`. ADR 059
   * loader-overlay brief.
   */
  external?: boolean;
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
 * Generated at build time by the upcoming RemoteManifestPlugin (Phase 4).
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
}

// ─────────────────────────────────────────────────────────────────────────────
// Component API (<Remote>)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Props of the <Remote /> component returned from useRemote().
 *
 * Prop classes (ADR-053 Decision 6, amended by ADR 059 D4):
 *  - System: `name`, `instanceId`, `fallback`, `mode` — host-side wire, not sent across.
 *  - Config: `config` — merged host-side, sent via __capsule_remote_config__ envelope.
 *  - Events: props matching /^on[A-Z]/ — auto-subscribed via transport.onMessage (app → host).
 *  - children: BANNED at TypeScript level (composition across frame boundary = future ADR).
 *
 * There is NO host→app props channel (ADR 059 D4: all host→app data is config). Extra
 * non-reserved, non-on* props are accepted by the type but ignored at runtime — pass
 * such data through `config` instead.
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
  /**
   * Execution substrate (ADR 058 D3). Explicit host-side declaration, orthogonal to origin.
   *  - 'app'       — iframe realm (own window/location/router). DEFAULT. Phase 1 active path.
   *  - 'component' — shadow-DOM realm. RESERVED SEAM — not implemented in Phase 1.
   */
  mode?: 'app' | 'component';
  /**
   * Опц. оверрайд темы remote'а. НЕ задан → remote наследует глобальную тему
   * хоста (useTheme/useDarkMode). Задан → форвардится вместо неё (per-remote
   * оверрайд, напр. студия задаёт тему канваса отдельно от темы своего хрома).
   * Host-side wire (как `config`) — НЕ часть config-envelope, едет в __capsule_theme__.
   */
  theme?: string;
  dark?: boolean;
  // children: INTENTIONALLY ABSENT — composition across iframe frame boundary
  // requires a separate architectural ADR (ADR-053 Decision 6 / risk #3).
  // Runtime silently ignores children if passed via any-cast.
  /** on* event handlers (subscribed app→host). Other extra keys are accepted but ignored — use `config`. */
  [key: string]: unknown;
}

// ─────────────────────────────────────────────────────────────────────────────
// Typed remote contracts (ADR 060 D6) — typed <Remote.View> props
//
// The augmentable `CapsuleRemotes` registry + `IRemoteContract` entry-shape live in
// the public barrel ('./index'), NOT here — see the import note at the top.
// ─────────────────────────────────────────────────────────────────────────────

/** `'markerClick'` → `'MarkerClick'` (capitalize the first char). */
type PascalCase<S extends string> = S extends `${infer H}${infer T}` ? `${Uppercase<H>}${T}` : S;

/**
 * `on<Event>` handler props derived from a remote's `out` map:
 * `{ markerClick: P }` → `{ onMarkerClick?: (payload: P) => void }`. Matches the
 * runtime auto-subscribe convention in RemoteComponent (`onSelectionChange` ↔ event
 * `selectionChange`) — out-event keys are bare camelCase, the host prop adds `on`.
 */
export type RemoteOutHandlers<Out extends Record<string, unknown>> = {
  [K in keyof Out & string as `on${PascalCase<K>}`]?: (payload: Out[K]) => void;
};

/**
 * host→app dispatch signature derived from a remote's `in` map (ADR 060 D1): a
 * typed call `dispatch(eventName, payload)` where `eventName ∈ keyof In` and
 * `payload` is `In[eventName]`. Symmetric counterpart of {@link RemoteOutHandlers}
 * (which derives the app→host `on<Out>` handlers).
 */
export type RemoteInDispatch<In extends Record<string, unknown>> = <E extends keyof In & string>(
  eventName: E,
  payload: In[E],
) => void;

/**
 * Props of `<Remote.View>` for a remote `name`:
 *  - known name (present in {@link CapsuleRemotes}) → literal `name` + typed
 *    `on<Out>` handlers; an unknown `on*` / a wrong payload is a TS error;
 *  - unknown name → loose {@link IRemoteComponentProps} (back-compat, no errors).
 *
 * The `[N]`/`[keyof…]` tuple-wrap prevents distribution when `N` is a union.
 */
export type IRemoteViewProps<N extends string> = [N] extends [keyof CapsuleRemotes]
  ? {
      name: N;
      instanceId?: string;
      fallback?: (status: 'loading' | 'error' | 'success') => JSX.Element;
      config?: Record<string, unknown>;
      mode?: 'app' | 'component';
      // Theme override (System-class host-side wire, как config/mode) — keeps the
      // typed known-name path consistent with IRemoteComponentProps so a studio can
      // set a known remote's theme independently of its own chrome (brief 2/2).
      theme?: string;
      dark?: boolean;
    } & (CapsuleRemotes[N] extends { out: infer Out extends Record<string, unknown> }
      ? RemoteOutHandlers<Out>
      : Record<never, never>)
  : IRemoteComponentProps;

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
 * - `dispatch(eventName, payload)` — host→app: dispatch a named contract `in` event
 *   into the embedded app (ADR 060 D1). Typed by `CapsuleRemotes[name]['in']` for a
 *   known `name`, loose otherwise.
 * - `send(event, payload)` — raw fire-and-forget (low-level; also used by `request`)
 * - `request(event, payload, timeoutMs?)` — awaitable, default 5s timeout
 * - `on(event, cb)` — subscribe, returns unsubscribe function
 * - `openStandalone(props)` — open this module in a separate window
 *
 * `N` = remote name (drives the typed `dispatch`); defaults to `string` (loose).
 */
export interface IRemoteHandle<N extends string = string> {
  dispatch: [N] extends [keyof CapsuleRemotes]
    ? CapsuleRemotes[N] extends { in: infer In extends Record<string, unknown> }
      ? RemoteInDispatch<In>
      : (eventName: string, payload?: unknown) => void
    : (eventName: string, payload?: unknown) => void;
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
  /** Get a communication handle for a remote module (typed by `name` when known). */
  remote: <N extends string = string>(name: N, instanceId?: string) => IRemoteHandle<N>;
  /** Mutate a module entry at runtime (e.g. swap URL after receiving a "new version" notification). */
  updateModule: (name: string, patch: Partial<IRemoteModuleConfig>) => void;
  /** Currently registered modules (reactive snapshot). */
  modules: Readonly<Record<string, IRemoteModuleConfig>>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Transport layer (internal, but exported as a public contract because
// custom transports may be plugged in by consumers in Phase 3+)
// ─────────────────────────────────────────────────────────────────────────────

// Phase 1: single transport. local/broadcast-channel/socket = YAGNI (ADR 058 D2),
// re-add here when a real cross-realm/cross-device case lands.
export type TransportKind = 'post-message';

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
 * Pluggable transport contract. Phase 1 ships a single transport (post-message);
 * substrate is chosen by the explicit `mode` prop, not by origin probing, so the
 * former `canReach` resolver is gone (ADR 058 D2/D3).
 */
export interface ITransport {
  kind: TransportKind;
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
 */
export type IRemoteBootstrap<Props = Record<string, unknown>, Config = Record<string, unknown>> = (
  root: HTMLElement,
  ctx: {
    /** Reactive accessor object for runtime props from the host. */
    props: Props;
    /** Reactive accessor object for ambient config (merged provider → module → instance). */
    config: Config;
    /** Channel for communicating back to the host. */
    channel: IRemoteChannel;
  },
) => IRemoteDispose;
