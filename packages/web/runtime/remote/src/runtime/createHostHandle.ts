/**
 * createHostHandle — factory producing an IRemoteHandle for a given (name, instanceId).
 *
 * Host-side counterpart of IRemoteChannel (module-side).
 * Wraps ITransport.send / onMessage into the IRemoteHandle API.
 *
 * ADR-053 Decision 8: openStandalone() = console.warn + return undefined (Phase 2 feature).
 */

import type { IRemoteHandle, IRemoteMessage, IRemoteResponse, ITransport } from '../interfaces';

const DEFAULT_TIMEOUT_MS = 5_000;

export const createHostHandle = <N extends string = string>(
  name: N,
  instanceId: string,
  transports: ITransport[],
  sessionId: string,
): IRemoteHandle<N> => {
  // Single transport (ADR 058 D2). Array shape kept; no origin-based resolution.
  const resolveTransport = (): ITransport => transports[0]!;

  const buildOutbound = (
    eventName: string,
    payload?: unknown,
    requestId?: string,
  ): IRemoteMessage => ({
    from: '__host__',
    fromInstance: '__host__',
    to: name,
    toInstance: instanceId,
    sessionId,
    eventName,
    payload,
    requestId,
  });

  // host→app fire-and-forget. Same wire as `send`, but exposed as the explicit
  // `dispatch` host→app API (ADR 060 D1) — typed by CapsuleRemotes[name]['in'] at the
  // call-site; runtime is name-agnostic, so the conditional type is cast here.
  const dispatch = ((eventName: string, payload?: unknown): void => {
    resolveTransport().send(buildOutbound(eventName, payload));
  }) as IRemoteHandle<N>['dispatch'];

  return {
    dispatch,

    send(event: string, payload?: unknown): void {
      resolveTransport().send(buildOutbound(event, payload));
    },

    request<T = unknown>(
      event: string,
      payload?: unknown,
      timeoutMs: number = DEFAULT_TIMEOUT_MS,
    ): Promise<IRemoteResponse<T>> {
      return new Promise<IRemoteResponse<T>>((resolve, reject) => {
        const requestId = `req-${Math.random().toString(36).slice(2)}`;
        const transport = resolveTransport();

        let unsub: (() => void) | undefined;
        const timer = setTimeout(() => {
          unsub?.();
          reject(new Error(`[capsule/remote] request '${event}' timed out after ${timeoutMs}ms`));
        }, timeoutMs);

        unsub = transport.onMessage((msg) => {
          if (
            msg.requestId === requestId &&
            msg.isResponse === true &&
            msg.from === name &&
            msg.fromInstance === instanceId
          ) {
            clearTimeout(timer);
            unsub?.();
            resolve({
              status: msg.status ?? 'success',
              payload: msg.payload as T,
              error: msg.error,
            });
          }
        });

        transport.send(buildOutbound(event, payload, requestId));
      });
    },

    on(event: string, cb: (payload?: unknown) => void): () => void {
      return resolveTransport().onMessage((msg) => {
        if (msg.from === name && msg.fromInstance === instanceId && msg.eventName === event) {
          cb(msg.payload);
        }
      });
    },

    openStandalone(_props?: Record<string, unknown>): void {
      console.warn(
        '[capsule/remote] openStandalone — Phase 2 feature (BroadcastChannel + standalone window not yet implemented)',
      );
    },
  };
};
