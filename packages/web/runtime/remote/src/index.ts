/**
 * @capsuletech/web-remote — Phase 1.
 *
 * Runtime: IframeTransport + RemoteProvider + useRemote + two-channel contract.
 * See ADR-015 + ADR-053 for the architecture.
 */

export type {
  // Phase 0 — transport + messaging
  IRemoteComponentProps,
  IRemoteContext,
  IRemoteHandle,
  IRemoteManifest,
  IRemoteMessage,
  IRemoteModuleConfig,
  IRemoteProviderProps,
  IRemoteResponse,
  ITransport,
  TransportKind,
  // Phase 1 additive — lifecycle + two-channel (ADR-053)
  IRemoteBootstrap,
  IRemoteChannel,
  IRemoteDispose,
} from './interfaces';

// Phase 1 runtime
export { RemoteProvider } from './runtime/RemoteProvider';
export { useRemote } from './runtime/useRemote';

// boot.js exposed via package.json#exports: "./boot.js": "./dist/boot.js"
// Import in host code: import bootUrl from '@capsuletech/web-remote/boot.js?url'
