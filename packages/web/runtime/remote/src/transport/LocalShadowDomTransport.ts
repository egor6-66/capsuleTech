/**
 * LocalShadowDomTransport — ADR 057 Phase 1B transport.
 *
 * In-memory routing for same-realm shadow-DOM mounts. Both host and module
 * share the same JS realm (no iframe boundary, no postMessage), so:
 *  - Messages are dispatched by direct subscriber call inside a microtask.
 *  - Payloads are passed by reference — no JSON serialization. Solid signals,
 *    stores and closures survive intact (ADR 057 §D1 reactive props direct-pass).
 *
 * One instance per RemoteProvider, mirroring IframeTransport. Messages from
 * other Providers (different sessionId) never reach this transport because
 * each Provider owns its own subscriber set.
 *
 * Selection model: `canReach` returns `true` for same-origin embedded mounts.
 * RemoteProvider places this transport first in the array — the resolver
 * (`find(canReach)`) picks shadow-DOM for any same-origin module and falls
 * back to IframeTransport only when shadow-DOM declines (Phase 2 cases:
 * standalone window, cross-origin).
 */

import type { IRemoteMessage, ITransport, TransportKind } from '../interfaces';

export class LocalShadowDomTransport implements ITransport {
  readonly kind: TransportKind = 'local-shadow-dom';

  private readonly subscribers = new Set<(msg: IRemoteMessage) => void>();
  private readonly sessionId: string;

  constructor(sessionId: string) {
    this.sessionId = sessionId;
  }

  /**
   * Phase 1B: same-origin embedded (non-standalone) only. Standalone windows
   * (Phase 2) need a real cross-frame transport (BroadcastChannel / postMessage).
   */
  canReach(target: {
    name: string;
    instanceId?: string;
    isStandalone: boolean;
    sameOrigin: boolean;
  }): boolean {
    return !target.isStandalone && target.sameOrigin;
  }

  send(msg: IRemoteMessage): void {
    // Direct in-memory dispatch — same realm, no postMessage, no JSON. The
    // microtask break mirrors postMessage semantics (async delivery) so
    // host-side and module-side handlers see a consistent ordering regardless
    // of which transport is active.
    if (msg.sessionId !== this.sessionId) return;
    queueMicrotask(() => {
      for (const cb of this.subscribers) cb(msg);
    });
  }

  onMessage(cb: (msg: IRemoteMessage) => void): () => void {
    this.subscribers.add(cb);
    return () => {
      this.subscribers.delete(cb);
    };
  }

  dispose(): void {
    this.subscribers.clear();
  }
}
