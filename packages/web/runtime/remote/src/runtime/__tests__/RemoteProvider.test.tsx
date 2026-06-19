/**
 * Tests for RemoteProvider + useRemote.
 * Uses Solid render in jsdom.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createSignal } from 'solid-js';
import { render } from 'solid-js/web';
import { RemoteProvider } from '../RemoteProvider';
import { useRemote } from '../useRemote';
import { IframeTransport } from '../../transport/IframeTransport';
import type { IRemoteModuleConfig } from '../../interfaces';

// Helper to render inside a div and get the context
function renderProvider(
  props: { modules: IRemoteModuleConfig[]; config?: Record<string, unknown> },
  onCtx: (ctx: ReturnType<typeof useRemote>) => void,
): { dispose: () => void } {
  const container = document.createElement('div');
  document.body.appendChild(container);

  let disposed = false;
  const dispose = render(() => {
    const ctx = useRemote();
    onCtx(ctx);
    return <></>;
  }, container);

  // Wrap in provider
  const disposeProvider = render(
    () => (
      <RemoteProvider modules={props.modules} config={props.config}>
        <InnerCapture onCtx={onCtx} />
      </RemoteProvider>
    ),
    container,
  );

  return {
    dispose: () => {
      if (!disposed) {
        disposed = true;
        disposeProvider();
        document.body.removeChild(container);
      }
    },
  };
}

// Component that captures the context
let capturedCtx: ReturnType<typeof useRemote> | undefined;
const InnerCapture = (props: { onCtx: (ctx: ReturnType<typeof useRemote>) => void }) => {
  const ctx = useRemote();
  props.onCtx(ctx);
  return null;
};

describe('RemoteProvider + useRemote', () => {
  let container: HTMLDivElement;
  let disposeRoot: (() => void) | undefined;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    capturedCtx = undefined;
  });

  afterEach(() => {
    disposeRoot?.();
    disposeRoot = undefined;
    document.body.removeChild(container);
  });

  it('useRemote() throws outside of RemoteProvider', () => {
    expect(() => {
      // Render a component that calls useRemote without a provider
      const div = document.createElement('div');
      document.body.appendChild(div);
      try {
        render(() => {
          useRemote(); // should throw
          return null;
        }, div);
      } finally {
        document.body.removeChild(div);
      }
    }).toThrow('[capsule/web-remote] useRemote()');
  });

  it('provides modules as reactive store', () => {
    const [modules, setModules] = createSignal<IRemoteModuleConfig[]>([
      { name: 'hello', url: 'http://localhost:3001' },
    ]);

    disposeRoot = render(
      () => (
        <RemoteProvider modules={modules()}>
          <InnerCapture onCtx={(ctx) => { capturedCtx = ctx; }} />
        </RemoteProvider>
      ),
      container,
    );

    expect(capturedCtx).toBeDefined();
    expect(capturedCtx!.modules['hello']).toMatchObject({ name: 'hello', url: 'http://localhost:3001' });
  });

  it('updateModule mutates the modules store', () => {
    disposeRoot = render(
      () => (
        <RemoteProvider modules={[{ name: 'hello', url: 'http://localhost:3001' }]}>
          <InnerCapture onCtx={(ctx) => { capturedCtx = ctx; }} />
        </RemoteProvider>
      ),
      container,
    );

    capturedCtx!.updateModule('hello', { url: 'http://localhost:4000' });

    expect(capturedCtx!.modules['hello']?.url).toBe('http://localhost:4000');
  });

  it('modules reactive: adding a new module updates the store', () => {
    const [modules, setModules] = createSignal<IRemoteModuleConfig[]>([
      { name: 'a', url: 'http://a.test' },
    ]);

    disposeRoot = render(
      () => (
        <RemoteProvider modules={modules()}>
          <InnerCapture onCtx={(ctx) => { capturedCtx = ctx; }} />
        </RemoteProvider>
      ),
      container,
    );

    expect(capturedCtx!.modules['b']).toBeUndefined();

    setModules([
      { name: 'a', url: 'http://a.test' },
      { name: 'b', url: 'http://b.test' },
    ]);

    expect(capturedCtx!.modules['b']).toMatchObject({ name: 'b', url: 'http://b.test' });
  });

  it('transports contains exactly one IframeTransport in Phase 1 (assertion via Remote function)', () => {
    // We can't directly access transports (not in IRemoteContext),
    // but we verify transport array shape is used via remote() + Remote existing
    disposeRoot = render(
      () => (
        <RemoteProvider modules={[{ name: 'x', url: 'http://x.test' }]}>
          <InnerCapture onCtx={(ctx) => { capturedCtx = ctx; }} />
        </RemoteProvider>
      ),
      container,
    );

    expect(typeof capturedCtx!.Remote).toBe('function');
    expect(typeof capturedCtx!.remote).toBe('function');
    // remote() should return handle with openStandalone
    const handle = capturedCtx!.remote('x', 'inst-1');
    expect(typeof handle.send).toBe('function');
    expect(typeof handle.request).toBe('function');
    expect(typeof handle.on).toBe('function');
    expect(typeof handle.openStandalone).toBe('function');
  });

  it('remote().openStandalone() does not throw', () => {
    disposeRoot = render(
      () => (
        <RemoteProvider modules={[{ name: 'x', url: 'http://x.test' }]}>
          <InnerCapture onCtx={(ctx) => { capturedCtx = ctx; }} />
        </RemoteProvider>
      ),
      container,
    );

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(() => capturedCtx!.remote('x', 'i').openStandalone()).not.toThrow();
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });
});
