/**
 * Tests for RemoteComponent shadow-DOM mount path — ADR 057 Phase 1B.
 *
 * The real `await import(entryUrl)` cannot be exercised in jsdom (no network
 * resolution for absolute http URLs). These tests cover the pieces that ARE
 * observable in unit env:
 *  - Dispatcher routes to the shadow-DOM container (not iframe) when transport
 *    kind = 'local-shadow-dom'.
 *  - The container element is rendered (verifies the Match branch fires).
 *  - The shadow-DOM path SKIPS the iframe envelope flow (no
 *    __capsule_remote_props__ / __capsule_remote_config__ messages sent).
 *  - on* props still auto-subscribe via transport.onMessage (works on both
 *    paths — the only difference is dispatch substrate).
 *
 * End-to-end shadow-root attach + dynamic import + bootstrap call is verified
 * by architect's real-browser smoke per brief §Acceptance — not here.
 */

import { render } from 'solid-js/web';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type {
  IRemoteManifest,
  IRemoteMessage,
  IRemoteModuleConfig,
  ITransport,
} from '../../interfaces';
import { type IRemoteComponentInternalProps, RemoteComponent } from '../RemoteComponent';

const MANIFEST: IRemoteManifest = {
  name: 'hello',
  version: '0.0.0',
  entry: '/remote-entry.js',
};

const makeFetchMock = () =>
  vi.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve(MANIFEST),
  });

type MockTransport = ITransport & {
  sent: IRemoteMessage[];
  triggerMessage: (msg: IRemoteMessage) => void;
};

const makeShadowDomMockTransport = (): MockTransport => {
  const sent: IRemoteMessage[] = [];
  const subscribers = new Set<(msg: IRemoteMessage) => void>();
  return {
    kind: 'local-shadow-dom',
    sent,
    triggerMessage: (msg) => {
      for (const cb of subscribers) cb(msg);
    },
    canReach: () => true,
    send: (msg) => sent.push(msg),
    onMessage: (cb) => {
      subscribers.add(cb);
      return () => subscribers.delete(cb);
    },
    dispose: () => {},
  };
};

const SESSION = 'sess-shadow';

const makeModules = (): Record<string, IRemoteModuleConfig> => ({
  hello: { name: 'hello', url: 'http://localhost:3001' },
});

describe('RemoteComponent — shadow-DOM mount path', () => {
  let container: HTMLDivElement;
  let disposeRoot: (() => void) | undefined;
  let transport: MockTransport;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    transport = makeShadowDomMockTransport();
    vi.stubGlobal('fetch', makeFetchMock());
  });

  afterEach(() => {
    disposeRoot?.();
    disposeRoot = undefined;
    document.body.removeChild(container);
    vi.unstubAllGlobals();
  });

  const renderRemote = (extra: Partial<IRemoteComponentInternalProps> = {}) => {
    const baseProps: IRemoteComponentInternalProps = {
      name: 'hello',
      instanceId: 'inst-1',
      transports: [transport as ITransport],
      sessionId: SESSION,
      modules: makeModules(),
      ...extra,
    };
    disposeRoot = render(() => <RemoteComponent {...baseProps} />, container);
  };

  const flushManifest = async () => {
    // createResource resolves on next microtask; allow a couple ticks for
    // the Switch to re-evaluate and the chosen branch to render.
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
  };

  it('renders the shadow-DOM container div (not an iframe) for kind=local-shadow-dom', async () => {
    renderRemote();
    await flushManifest();
    expect(container.querySelector('iframe')).toBeNull();
    expect(container.querySelector('.capsule-remote-shadow-host')).not.toBeNull();
  });

  it('does NOT emit __capsule_remote_props__ envelopes on the shadow-DOM path', async () => {
    renderRemote({ greeting: 'World' } as unknown as Partial<IRemoteComponentInternalProps>);
    await flushManifest();
    const propsEnvelopes = transport.sent.filter(
      (m) => m.eventName === '__capsule_remote_props__',
    );
    expect(propsEnvelopes).toHaveLength(0);
  });

  it('does NOT emit __capsule_remote_config__ envelopes on the shadow-DOM path', async () => {
    renderRemote({ config: { theme: 'dark' } });
    await flushManifest();
    const configEnvelopes = transport.sent.filter(
      (m) => m.eventName === '__capsule_remote_config__',
    );
    expect(configEnvelopes).toHaveLength(0);
  });

  it('on* props auto-subscribe via transport.onMessage', async () => {
    const cb = vi.fn();
    renderRemote({
      onSelectionChange: cb,
    } as unknown as Partial<IRemoteComponentInternalProps>);
    await flushManifest();
    transport.triggerMessage({
      from: 'hello',
      fromInstance: 'inst-1',
      to: '__host__',
      sessionId: SESSION,
      eventName: 'selectionChange',
      payload: { id: 1 },
    });
    expect(cb).toHaveBeenCalledWith({ id: 1 });
  });
});
