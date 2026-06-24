/**
 * IframeTransport — Phase 1 transport (same-origin, post-message through iframe).
 *
 * One instance per RemoteProvider. Serves all iframe instances via a single
 * window.addEventListener('message') handler. Messages are filtered by sessionId
 * to prevent cross-Provider collision.
 *
 * ADR-015 amendment 2026-06-19 + ADR-053 Decision 8.
 */

import type { IRemoteMessage, ITransport, TransportKind } from '../interfaces';

/** Routing key: `${name}:${instanceId}` */
type RegistryKey = string;

const makeKey = (name: string, instanceId: string): RegistryKey => `${name}:${instanceId}`;

export class IframeTransport implements ITransport {
  readonly kind: TransportKind = 'post-message';

  /** Iframe elements registered by RemoteComponent on mount. */
  private readonly registry = new Map<RegistryKey, HTMLIFrameElement>();

  /** Message subscribers — called for every incoming message that passes sessionId filter. */
  private readonly subscribers = new Set<(msg: IRemoteMessage) => void>();

  /** The sessionId this transport belongs to (set in constructor). */
  private readonly sessionId: string;

  private readonly messageHandler: (event: MessageEvent) => void;

  constructor(sessionId: string) {
    this.sessionId = sessionId;

    this.messageHandler = (event: MessageEvent) => {
      // Ignore non-plain-object messages (e.g. browser extensions)
      if (!event.data || typeof event.data !== 'object') return;
      const msg = event.data as IRemoteMessage;
      // Filter by sessionId — cross-Provider messages are silently dropped
      if (msg.sessionId !== this.sessionId) return;

      for (const cb of this.subscribers) {
        cb(msg);
      }
    };

    window.addEventListener('message', this.messageHandler);
  }

  /**
   * Register an iframe element for a given (name, instanceId) pair.
   * Called by RemoteComponent on mount (after iframe ref is available).
   */
  register(name: string, instanceId: string, iframe: HTMLIFrameElement): void {
    this.registry.set(makeKey(name, instanceId), iframe);
  }

  /**
   * Unregister the iframe for a given (name, instanceId) pair.
   * Called by RemoteComponent onCleanup.
   */
  unregister(name: string, instanceId: string): void {
    this.registry.delete(makeKey(name, instanceId));
  }

  send(msg: IRemoteMessage): void {
    const key = makeKey(msg.to, msg.toInstance ?? '');

    if (msg.toInstance !== undefined) {
      // Addressed to a specific instance
      const iframe = this.registry.get(key);
      if (!iframe?.contentWindow) return;
      iframe.contentWindow.postMessage(msg, '*');
    } else {
      // Broadcast — send to all instances with this name
      for (const [k, iframe] of this.registry) {
        if (k.startsWith(`${msg.to}:`) && iframe.contentWindow) {
          iframe.contentWindow.postMessage(msg, '*');
        }
      }
    }
  }

  onMessage(cb: (msg: IRemoteMessage) => void): () => void {
    this.subscribers.add(cb);
    return () => {
      this.subscribers.delete(cb);
    };
  }

  dispose(): void {
    window.removeEventListener('message', this.messageHandler);
    this.registry.clear();
    this.subscribers.clear();
  }
}
