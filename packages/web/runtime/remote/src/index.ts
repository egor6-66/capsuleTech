/**
 * @capsuletech/web-remote — Phase 1.
 *
 * Runtime: IframeTransport + RemoteProvider + useRemote + two-channel contract.
 * See ADR-015 + ADR-053 for the architecture.
 */

export type {
  // Phase 1 additive — lifecycle + two-channel (ADR-053)
  IRemoteBootstrap,
  IRemoteChannel,
  // Phase 0 — transport + messaging
  IRemoteComponentProps,
  IRemoteContext,
  IRemoteDispose,
  IRemoteHandle,
  IRemoteManifest,
  IRemoteMessage,
  IRemoteModuleConfig,
  IRemoteProviderProps,
  IRemoteResponse,
  // ADR 060 D6 — typed <Remote.View> props (reads CapsuleRemotes declared below)
  IRemoteViewProps,
  ITransport,
  RemoteInDispatch,
  RemoteOutHandlers,
  TransportKind,
} from './interfaces';

// ─────────────────────────────────────────────────────────────────────────────
// Typed remote contracts registry (ADR 060 D6)
//
// DECLARED HERE — in the public barrel — on purpose. A consumer augments the
// package as `declare module '@capsuletech/web-remote' { interface CapsuleRemotes }`;
// that augmentation merges into the declaration that lives in THIS module (the one
// resolved as `@capsuletech/web-remote`). Re-exporting it from another file
// (`export type { CapsuleRemotes } from './interfaces'`) breaks the merge across the
// package boundary — the augmentation and the reader (`IRemoteViewProps`, which
// imports CapsuleRemotes from here) would point at different symbols, so a real app's
// generated `remotes.d.ts` augmentation never reached `IRemoteViewProps`. This is the
// TanStack Router `Register` pattern: the augmentable interface is owned by the public
// entry module, and all internal readers import it from there.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Shape of one {@link CapsuleRemotes} entry: a remote's typed event maps.
 *  - `out` — app→host events; the host subscribes via `on<Event>` props.
 *  - `in`  — host→app events; dispatched to the remote.
 * Each map is `eventName → payloadType`.
 */
export interface IRemoteContract {
  in: Record<string, unknown>;
  out: Record<string, unknown>;
}

/**
 * Registry of typed remote contracts, keyed by remote `name`. EMPTY here — this is
 * an augmentation target. The generated `.capsule/@types/remotes.d.ts`
 * (vite-builder, ADR 060 Phase 2) fills it from each vendored contract:
 *
 * ```ts
 * declare module '@capsuletech/web-remote' {
 *   interface CapsuleRemotes {
 *     map: { in: { setView: { lat: number } }; out: { markerClick: { id: string } } };
 *   }
 * }
 * ```
 *
 * With no augmentation `keyof CapsuleRemotes` is `never` → `<Remote.View>` falls back
 * to the loose {@link IRemoteComponentProps} typing (nothing breaks). Each value is
 * expected to satisfy {@link IRemoteContract}.
 */
// biome-ignore lint/suspicious/noEmptyInterface: augmentation target — intentionally empty.
export interface CapsuleRemotes {}

// Phase 1 runtime
export { RemoteProvider } from './runtime/RemoteProvider';
export { useRemote } from './runtime/useRemote';

// ADR 059: app-mode loads the app via <iframe src> (self-contained). No host-side
// boot shell / import-map — the app boots itself like standalone. The former
// './boot.js' subpath export is removed.
