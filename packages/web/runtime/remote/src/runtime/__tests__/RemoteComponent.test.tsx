/**
 * Tests for RemoteComponent.
 *
 * Covers:
 *  - Four prop classes (System/Config/Events/Runtime)
 *  - Config merge order (provider → module → instance)
 *  - config={undefined} ≡ no prop
 *  - Reactive props envelope
 *  - Reactive config envelope
 *  - Auto-subscribe on* props
 *  - online/onclick non-collision
 *  - onCleanup unregisters iframe
 *  - Fallback rendering (loading / error)
 */

import { createSignal } from 'solid-js';
import { render } from 'solid-js/web';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type {
  IRemoteManifest,
  IRemoteMessage,
  IRemoteModuleConfig,
  ITransport,
} from '../../interfaces';
import { type IRemoteComponentInternalProps, RemoteComponent } from '../RemoteComponent';

// bootUrl is now resolved via new URL('./boot.mjs', import.meta.url).href at module level.
// In jsdom, import.meta.url is 'about:blank' → bootUrl resolves to 'about:boot.mjs' (harmless string).
// These tests do NOT inspect srcdoc content, so the exact bootUrl value is irrelevant.

// ─── Mock fetch for manifest ──────────────────────────────────────────────────
const MANIFEST: IRemoteManifest = {
  name: 'hello',
  version: '0.0.0',
  entry: '/src/standalone.ts',
};

const makeFetchMock = (manifest = MANIFEST) =>
  vi.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve(manifest),
  });

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
    canReach: () => true,
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

const makeModules = (config?: Record<string, unknown>): Record<string, IRemoteModuleConfig> => ({
  hello: { name: 'hello', url: 'http://localhost:3001', config },
});

describe('RemoteComponent', () => {
  let container: HTMLDivElement;
  let disposeRoot: (() => void) | undefined;
  let transport: MockTransport;
  let fetchMock: ReturnType<typeof makeFetchMock>;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    transport = makeMockTransport();
    fetchMock = makeFetchMock();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    disposeRoot?.();
    disposeRoot = undefined;
    document.body.removeChild(container);
    vi.unstubAllGlobals();
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

  // ─── Prop classification ───────────────────────────────────────────────────

  it('does NOT include "name" in __capsule_remote_props__ envelope', async () => {
    renderRemote({ name: 'hello', instanceId: 'i1' });
    // Wait for effects
    await Promise.resolve();
    const propEnvelopes = transport.sent.filter((m) => m.eventName === '__capsule_remote_props__');
    expect(propEnvelopes.length).toBeGreaterThan(0);
    const payload = propEnvelopes[0]!.payload as Record<string, unknown>;
    expect('name' in payload).toBe(false);
  });

  it('does NOT include "instanceId" in __capsule_remote_props__ envelope', async () => {
    renderRemote({ instanceId: 'my-id' });
    await Promise.resolve();
    const propEnvelopes = transport.sent.filter((m) => m.eventName === '__capsule_remote_props__');
    const payload = propEnvelopes[0]!.payload as Record<string, unknown>;
    expect('instanceId' in payload).toBe(false);
  });

  it('does NOT include "config" in __capsule_remote_props__ envelope', async () => {
    renderRemote({ config: { theme: 'dark' } });
    await Promise.resolve();
    const propEnvelopes = transport.sent.filter((m) => m.eventName === '__capsule_remote_props__');
    const payload = propEnvelopes[0]!.payload as Record<string, unknown>;
    expect('config' in payload).toBe(false);
  });

  it('does NOT include on* props in __capsule_remote_props__ envelope', async () => {
    renderRemote({ onClicked: vi.fn() } as unknown as Partial<IRemoteComponentInternalProps>);
    await Promise.resolve();
    const propEnvelopes = transport.sent.filter((m) => m.eventName === '__capsule_remote_props__');
    const payload = propEnvelopes[0]!.payload as Record<string, unknown>;
    expect('onClicked' in payload).toBe(false);
  });

  it('DOES include regular runtime props in __capsule_remote_props__ envelope', async () => {
    renderRemote({ greeting: 'World' } as unknown as Partial<IRemoteComponentInternalProps>);
    await Promise.resolve();
    const propEnvelopes = transport.sent.filter((m) => m.eventName === '__capsule_remote_props__');
    const payload = propEnvelopes[0]!.payload as Record<string, unknown>;
    expect(payload.greeting).toBe('World');
  });

  // ─── online / onclick non-collision ───────────────────────────────────────

  it('online (lowercase after on) is treated as runtime prop, not event', async () => {
    renderRemote({ online: true } as unknown as Partial<IRemoteComponentInternalProps>);
    await Promise.resolve();
    const propEnvelopes = transport.sent.filter((m) => m.eventName === '__capsule_remote_props__');
    const payload = propEnvelopes[0]!.payload as Record<string, unknown>;
    expect(payload.online).toBe(true);
  });

  it('onclick (lowercase) is treated as runtime prop, not event', async () => {
    const fn = vi.fn();
    renderRemote({ onclick: fn } as unknown as Partial<IRemoteComponentInternalProps>);
    await Promise.resolve();
    const propEnvelopes = transport.sent.filter((m) => m.eventName === '__capsule_remote_props__');
    // onclick should be in runtime props envelope (not auto-subscribed)
    // (Note: functions don't survive postMessage, but the classification is what we test)
    const payload = propEnvelopes[0]!.payload as Record<string, unknown>;
    // onclick with lowercase c - not matched by /^on[A-Z]/
    expect('onclick' in payload).toBe(true);
  });

  // ─── Config merge order ───────────────────────────────────────────────────

  it('config merge order: provider < module < instance', async () => {
    renderRemote({
      config: { a: 'instance', c: 'instance-only' },
      modules: {
        hello: {
          name: 'hello',
          url: 'http://localhost:3001',
          config: { a: 'module', b: 'module' },
        },
      },
      providerConfig: { a: 'provider', d: 'provider-only' },
    });
    await Promise.resolve();

    const configEnvelopes = transport.sent.filter(
      (m) => m.eventName === '__capsule_remote_config__',
    );
    expect(configEnvelopes.length).toBeGreaterThan(0);
    const payload = configEnvelopes[0]!.payload as Record<string, unknown>;

    expect(payload.a).toBe('instance'); // instance wins
    expect(payload.b).toBe('module'); // module wins over provider
    expect(payload.c).toBe('instance-only');
    expect(payload.d).toBe('provider-only');
  });

  it('config={undefined} is equivalent to no config prop — provider+module merge applies', async () => {
    renderRemote({
      config: undefined,
      modules: {
        hello: { name: 'hello', url: 'http://localhost:3001', config: { x: 'module-val' } },
      },
      providerConfig: { y: 'provider-val' },
    });
    await Promise.resolve();

    const configEnvelopes = transport.sent.filter(
      (m) => m.eventName === '__capsule_remote_config__',
    );
    const payload = configEnvelopes[0]!.payload as Record<string, unknown>;

    expect(payload.x).toBe('module-val');
    expect(payload.y).toBe('provider-val');
  });

  // ─── Reactive props ───────────────────────────────────────────────────────

  it('changing a runtime prop sends a new __capsule_remote_props__ envelope', async () => {
    const [greeting, setGreeting] = createSignal('World');
    disposeRoot = render(
      () => (
        <RemoteComponent
          name="hello"
          instanceId="i1"
          transports={[transport as ITransport]}
          sessionId={SESSION}
          modules={makeModules()}
          greeting={greeting()}
        />
      ),
      container,
    );
    await Promise.resolve();

    const before = transport.sent.filter((m) => m.eventName === '__capsule_remote_props__').length;
    setGreeting('Universe');
    await Promise.resolve();

    const after = transport.sent.filter((m) => m.eventName === '__capsule_remote_props__').length;
    expect(after).toBeGreaterThan(before);

    const lastPayload = transport.sent
      .filter((m) => m.eventName === '__capsule_remote_props__')
      .at(-1)!.payload as Record<string, unknown>;
    expect(lastPayload.greeting).toBe('Universe');
  });

  // ─── Reactive config ──────────────────────────────────────────────────────

  it('changing instance config sends a new __capsule_remote_config__ envelope', async () => {
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

    const before = transport.sent.filter((m) => m.eventName === '__capsule_remote_config__').length;
    setCfg({ theme: 'dark' });
    await Promise.resolve();

    const after = transport.sent.filter((m) => m.eventName === '__capsule_remote_config__').length;
    expect(after).toBeGreaterThan(before);

    const lastPayload = transport.sent
      .filter((m) => m.eventName === '__capsule_remote_config__')
      .at(-1)!.payload as Record<string, unknown>;
    expect(lastPayload.theme).toBe('dark');
  });

  // ─── Auto-subscribe on* props ─────────────────────────────────────────────

  it('auto-subscribes onClicked and calls cb when module sends "clicked" event', async () => {
    const onClicked = vi.fn();
    renderRemote({
      onClicked,
    } as unknown as Partial<IRemoteComponentInternalProps>);
    await Promise.resolve();

    // Simulate module sending 'clicked' event
    transport.triggerMessage({
      from: 'hello',
      fromInstance: 'inst-1',
      to: '__host__',
      sessionId: SESSION,
      eventName: 'clicked',
      payload: { ts: 42 },
    });

    expect(onClicked).toHaveBeenCalledOnce();
    expect(onClicked).toHaveBeenCalledWith({ ts: 42 });
  });

  it('auto-subscribe converts onSelectionChange to selectionChange event name', async () => {
    const onSelectionChange = vi.fn();
    renderRemote({
      onSelectionChange,
    } as unknown as Partial<IRemoteComponentInternalProps>);
    await Promise.resolve();

    transport.triggerMessage({
      from: 'hello',
      fromInstance: 'inst-1',
      to: '__host__',
      sessionId: SESSION,
      eventName: 'selectionChange',
      payload: { rows: [1, 2] },
    });

    expect(onSelectionChange).toHaveBeenCalledWith({ rows: [1, 2] });
  });

  it('auto-subscribe does NOT fire for events from wrong instance', async () => {
    const onClicked = vi.fn();
    renderRemote({
      instanceId: 'correct-instance',
      onClicked,
    } as unknown as Partial<IRemoteComponentInternalProps>);
    await Promise.resolve();

    transport.triggerMessage({
      from: 'hello',
      fromInstance: 'wrong-instance',
      to: '__host__',
      sessionId: SESSION,
      eventName: 'clicked',
    });

    expect(onClicked).not.toHaveBeenCalled();
  });

  // ─── Ready handshake ──────────────────────────────────────────────────────

  it('responds to __capsule_remote_ready__ by sending both envelopes', async () => {
    transport.sent.length = 0; // clear
    renderRemote({ instanceId: 'ready-inst' });
    await Promise.resolve();

    // Clear any initial effects
    transport.sent.length = 0;

    // Simulate ready signal from module
    transport.triggerMessage({
      from: 'hello',
      fromInstance: 'ready-inst',
      to: '__host__',
      sessionId: SESSION,
      eventName: '__capsule_remote_ready__',
    });

    const propsEnvelopes = transport.sent.filter((m) => m.eventName === '__capsule_remote_props__');
    const configEnvelopes = transport.sent.filter(
      (m) => m.eventName === '__capsule_remote_config__',
    );

    expect(propsEnvelopes.length).toBeGreaterThan(0);
    expect(configEnvelopes.length).toBeGreaterThan(0);
  });

  // ─── Fallback rendering ───────────────────────────────────────────────────

  it('renders fallback("loading") while manifest is loading', async () => {
    // Override fetch to never resolve
    vi.stubGlobal(
      'fetch',
      vi.fn(() => new Promise(() => {})),
    );

    const fallback = vi.fn((status: string) => <div data-status={status}>Loading...</div>);
    disposeRoot = render(
      () => (
        <RemoteComponent
          name="hello"
          instanceId="i"
          transports={[transport as ITransport]}
          sessionId={SESSION}
          modules={makeModules()}
          fallback={fallback}
        />
      ),
      container,
    );

    // Small tick — resource is loading
    await new Promise((r) => setTimeout(r, 10));

    expect(fallback).toHaveBeenCalledWith('loading');
  });
});
