/**
 * Tests for RemoteComponent (ADR 059 app-mode = iframe-src).
 *
 * Covers:
 *  - app-mode renders <iframe src> = app root + EMBED_PROTOCOL identity query
 *  - mode seam ('component' → error fallback, no iframe)
 *  - props envelope prop-classification (System/Config/Events/Runtime)
 *  - config override envelope: merge order, reactivity, sent on __capsule_app_ready__
 *  - auto-subscribe on* props
 *  - degradation: no ready within MOUNT_TIMEOUT_MS → placeholder, no crash
 */

import { EMBED_PROTOCOL } from '@capsuletech/web-core/bootstrap';
import { createSignal } from 'solid-js';
import { render } from 'solid-js/web';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { IRemoteMessage, IRemoteModuleConfig, ITransport } from '../../interfaces';
import { type IRemoteComponentInternalProps, RemoteComponent } from '../RemoteComponent';

// ─── Mock transport ───────────────────────────────────────────────────────────

type MockTransport = ITransport & {
  sent: IRemoteMessage[];
  triggerMessage: (msg: IRemoteMessage) => void;
  registrations: Map<string, HTMLIFrameElement>;
};

const makeMockTransport = (): MockTransport => {
  const sent: IRemoteMessage[] = [];
  const subscribers = new Set<(msg: IRemoteMessage) => void>();
  const registrations = new Map<string, HTMLIFrameElement>();

  return {
    kind: 'post-message',
    sent,
    registrations,
    triggerMessage: (msg: IRemoteMessage) => {
      for (const cb of subscribers) cb(msg);
    },
    send: (msg) => sent.push(msg),
    onMessage: (cb) => {
      subscribers.add(cb);
      return () => subscribers.delete(cb);
    },
    dispose: () => {},
    register: (name: string, instanceId: string, el: HTMLIFrameElement) => {
      registrations.set(`${name}:${instanceId}`, el);
    },
    unregister: (name: string, instanceId: string) => {
      registrations.delete(`${name}:${instanceId}`);
    },
  } as MockTransport & {
    register: (...args: unknown[]) => void;
    unregister: (...args: unknown[]) => void;
  };
};

const SESSION = 'sess-test';
const APP_ORIGIN = 'http://localhost:3001';

const makeModules = (config?: Record<string, unknown>): Record<string, IRemoteModuleConfig> => ({
  hello: { name: 'hello', url: APP_ORIGIN, config },
});

describe('RemoteComponent', () => {
  let container: HTMLDivElement;
  let disposeRoot: (() => void) | undefined;
  let transport: MockTransport;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    transport = makeMockTransport();
  });

  afterEach(() => {
    disposeRoot?.();
    disposeRoot = undefined;
    document.body.removeChild(container);
  });

  const renderRemote = (props: Partial<IRemoteComponentInternalProps> = {}) => {
    const baseProps: IRemoteComponentInternalProps = {
      name: 'hello',
      instanceId: 'inst-1',
      transports: [transport as ITransport],
      sessionId: SESSION,
      modules: makeModules(),
      ...props,
    };
    disposeRoot = render(() => <RemoteComponent {...baseProps} />, container);
  };

  const configEnvelopes = () =>
    transport.sent.filter((m) => m.eventName === EMBED_PROTOCOL.configEvent);

  // ─── app-mode iframe src (ADR 059 D1) ───────────────────────────────────────

  it('renders <iframe src> = app root + identity query (session/name)', async () => {
    renderRemote();
    await Promise.resolve();
    const iframe = container.querySelector('iframe');
    expect(iframe).not.toBeNull();
    const src = new URL(iframe!.getAttribute('src')!);
    expect(src.origin).toBe(APP_ORIGIN);
    expect(src.pathname).toBe('/');
    expect(src.searchParams.get(EMBED_PROTOCOL.query.session)).toBe(SESSION);
    expect(src.searchParams.get(EMBED_PROTOCOL.query.name)).toBe('hello');
  });

  // ─── Config override envelope (ADR 059 D4) ──────────────────────────────────

  it('config merge order: provider < module < instance', async () => {
    renderRemote({
      config: { a: 'instance', c: 'instance-only' },
      modules: {
        hello: { name: 'hello', url: APP_ORIGIN, config: { a: 'module', b: 'module' } },
      },
      providerConfig: { a: 'provider', d: 'provider-only' },
    });
    await Promise.resolve();
    expect(configEnvelopes().length).toBeGreaterThan(0);
    const payload = configEnvelopes()[0]!.payload as Record<string, unknown>;
    expect(payload.a).toBe('instance');
    expect(payload.b).toBe('module');
    expect(payload.c).toBe('instance-only');
    expect(payload.d).toBe('provider-only');
  });

  it('config={undefined} ≡ no config prop — provider+module merge applies', async () => {
    renderRemote({
      config: undefined,
      modules: { hello: { name: 'hello', url: APP_ORIGIN, config: { x: 'module-val' } } },
      providerConfig: { y: 'provider-val' },
    });
    await Promise.resolve();
    const payload = configEnvelopes()[0]!.payload as Record<string, unknown>;
    expect(payload.x).toBe('module-val');
    expect(payload.y).toBe('provider-val');
  });

  it('sends a config override after __capsule_app_ready__', async () => {
    renderRemote({ instanceId: 'ready-inst', config: { theme: 'dark' } });
    await Promise.resolve();
    transport.sent.length = 0; // clear initial (reactive) envelopes

    // App posts ready with from === name (self-contained: no host-side instanceId).
    transport.triggerMessage({
      from: 'hello',
      fromInstance: 'hello',
      to: EMBED_PROTOCOL.hostTarget,
      sessionId: SESSION,
      eventName: EMBED_PROTOCOL.readyEvent,
    });

    const cfg = configEnvelopes();
    expect(cfg.length).toBeGreaterThan(0);
    expect((cfg.at(-1)!.payload as Record<string, unknown>).theme).toBe('dark');
  });

  // ─── Reactive config ────────────────────────────────────────────────────────

  it('changing instance config re-sends __capsule_remote_config__', async () => {
    const [cfg, setCfg] = createSignal<Record<string, unknown>>({ theme: 'light' });
    disposeRoot = render(
      () => (
        <RemoteComponent
          name="hello"
          instanceId="i1"
          transports={[transport as ITransport]}
          sessionId={SESSION}
          modules={makeModules()}
          config={cfg()}
        />
      ),
      container,
    );
    await Promise.resolve();
    const before = configEnvelopes().length;
    setCfg({ theme: 'dark' });
    await Promise.resolve();
    expect(configEnvelopes().length).toBeGreaterThan(before);
    expect((configEnvelopes().at(-1)!.payload as Record<string, unknown>).theme).toBe('dark');
  });

  // ─── Auto-subscribe on* props (app → host events) ──────────────────────────

  it('auto-subscribes onClicked and fires on the "clicked" event', async () => {
    const onClicked = vi.fn();
    renderRemote({ onClicked } as unknown as Partial<IRemoteComponentInternalProps>);
    await Promise.resolve();
    transport.triggerMessage({
      from: 'hello',
      fromInstance: 'inst-1',
      to: EMBED_PROTOCOL.hostTarget,
      sessionId: SESSION,
      eventName: 'clicked',
      payload: { ts: 42 },
    });
    expect(onClicked).toHaveBeenCalledWith({ ts: 42 });
  });

  it('converts onSelectionChange → selectionChange event name', async () => {
    const onSelectionChange = vi.fn();
    renderRemote({ onSelectionChange } as unknown as Partial<IRemoteComponentInternalProps>);
    await Promise.resolve();
    transport.triggerMessage({
      from: 'hello',
      fromInstance: 'inst-1',
      to: EMBED_PROTOCOL.hostTarget,
      sessionId: SESSION,
      eventName: 'selectionChange',
      payload: { rows: [1, 2] },
    });
    expect(onSelectionChange).toHaveBeenCalledWith({ rows: [1, 2] });
  });

  it('does NOT fire on* for events from the wrong instance', async () => {
    const onClicked = vi.fn();
    renderRemote({
      instanceId: 'correct-instance',
      onClicked,
    } as unknown as Partial<IRemoteComponentInternalProps>);
    await Promise.resolve();
    transport.triggerMessage({
      from: 'hello',
      fromInstance: 'wrong-instance',
      to: EMBED_PROTOCOL.hostTarget,
      sessionId: SESSION,
      eventName: 'clicked',
    });
    expect(onClicked).not.toHaveBeenCalled();
  });

  // ─── mode seam (ADR 058 D3) ────────────────────────────────────────────────

  it('mode "component" → console.error + fallback("error"), no iframe', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const fallback = vi.fn((status: string) => <div data-status={status}>fb</div>);
    renderRemote({
      mode: 'component',
      fallback,
    } as unknown as Partial<IRemoteComponentInternalProps>);
    await Promise.resolve();
    expect(errorSpy).toHaveBeenCalledOnce();
    expect(errorSpy.mock.calls[0]![0]).toContain('mode="component"');
    expect(fallback).toHaveBeenCalledWith('error');
    expect(container.querySelector('iframe')).toBeNull();
    errorSpy.mockRestore();
  });

  // ─── Degradation: app never readies → placeholder, no crash (ADR 059) ───────

  describe('remote unavailable (no ready within timeout)', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });
    afterEach(() => {
      vi.useRealTimers();
    });

    it('shows the iframe while connecting (before timeout)', async () => {
      renderRemote();
      await Promise.resolve();
      expect(container.querySelector('iframe')).not.toBeNull();
      expect(container.querySelector('[data-capsule-remote-error="hello"]')).toBeNull();
    });

    it('swaps to the placeholder when no ready arrives, without crashing', async () => {
      expect(() => renderRemote()).not.toThrow();
      await vi.advanceTimersByTimeAsync(5_000);
      expect(container.isConnected).toBe(true);
      expect(container.querySelector('iframe')).toBeNull();
      expect(container.querySelector('[data-capsule-remote-error="hello"]')).not.toBeNull();
    });

    it('keeps the iframe (no placeholder) when ready arrives before timeout', async () => {
      renderRemote();
      await Promise.resolve();
      transport.triggerMessage({
        from: 'hello',
        fromInstance: 'hello',
        to: EMBED_PROTOCOL.hostTarget,
        sessionId: SESSION,
        eventName: EMBED_PROTOCOL.readyEvent,
      });
      await vi.advanceTimersByTimeAsync(5_000);
      expect(container.querySelector('iframe')).not.toBeNull();
      expect(container.querySelector('[data-capsule-remote-error="hello"]')).toBeNull();
    });
  });
});
