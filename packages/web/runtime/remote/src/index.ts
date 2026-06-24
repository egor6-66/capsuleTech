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
  ITransport,
  TransportKind,
} from './interfaces';

// Phase 1 runtime
export { RemoteProvider } from './runtime/RemoteProvider';
export { useRemote } from './runtime/useRemote';

// ADR 059: app-mode loads the app via <iframe src> (self-contained). No host-side
// boot shell / import-map — the app boots itself like standalone. The former
// './boot.js' subpath export is removed.
