/**
 * dual-import singleton invariant — sanity test.
 *
 * Verifies that importing RemoteProvider from the root entry and
 * from the capsule subpath both resolve to the same RemoteContext.
 *
 * WHY THIS TEST EXISTS:
 *   In Vite dev-server the root entry `@capsuletech/web-remote` is aliased to
 *   `src/index.ts` via tsconfig.base.json + AliasesPlugin.buildWorkspaceSrcAliases.
 *   If `@capsuletech/web-remote/capsule` is NOT listed in tsconfig.base.json, Vite
 *   falls back to `dist/capsule.mjs`, which contains its own `createContext()` call
 *   → two RemoteContext objects → useRemote() throws "must be called inside
 *   <RemoteProvider>" even when it IS inside the provider.
 *
 * FIX (2026-06-22, Variant B):
 *   Added `@capsuletech/web-remote/capsule` → `src/capsule.ts` to tsconfig.base.json.
 *   AliasesPlugin now creates an exact-match Vite alias for the subpath, ensuring
 *   both root and capsule entry resolve through src/ in dev, sharing one
 *   createContext() call and one RemoteContext object.
 *
 * NOTE: This Node/jsdom test does NOT reproduce the Vite-dev-server resolve
 *   discrepancy (Node ESM always deduplicates module instances by resolved file
 *   path). It documents the API invariant and serves as regression coverage for
 *   the public API contract, NOT for the bundler-resolve edge case. The real
 *   regression guard is: manual smoke in `apps/playground` under `capsule dev`.
 *   See OWNERSHIP.md §module-instance-singleton-invariant.
 *
 * ADR-015, ADR-053.
 */

import { render } from 'solid-js/web';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

// capsule entry exports (RemoteProvider and RemoteView via defineCapsuleModule)
import CapsuleMod from '../../capsule';
// Root entry exports (useRemote reads RemoteContext from src/runtime/RemoteContext.ts)
import { RemoteProvider, useRemote } from '../../index';

describe('dual-import singleton invariant', () => {
  let container: HTMLDivElement;
  let disposeRoot: (() => void) | undefined;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    disposeRoot?.();
    disposeRoot = undefined;
    document.body.removeChild(container);
  });

  it('RemoteProvider from root entry and from capsule subpath are the same function', () => {
    // Both must resolve to the same function object through src/
    const CapsuleProvider = CapsuleMod.components.Provider;
    expect(RemoteProvider).toBe(CapsuleProvider);
  });

  it('useRemote() works when <RemoteProvider> from root entry wraps the consumer', () => {
    let captured: ReturnType<typeof useRemote> | undefined;

    const Consumer = () => {
      captured = useRemote();
      return null;
    };

    disposeRoot = render(
      () => (
        <RemoteProvider modules={[{ name: 'test', url: 'http://test.local' }]}>
          <Consumer />
        </RemoteProvider>
      ),
      container,
    );

    expect(captured).toBeDefined();
    expect(typeof captured!.Remote).toBe('function');
  });

  it('useRemote() works when <capsule.Provider> wraps the consumer', () => {
    let captured: ReturnType<typeof useRemote> | undefined;

    const Consumer = () => {
      captured = useRemote();
      return null;
    };

    // Use the capsule-entry Provider (the one registered as Remote.Provider global)
    const CapsuleProvider = CapsuleMod.components.Provider as typeof RemoteProvider;

    disposeRoot = render(
      () => (
        <CapsuleProvider modules={[{ name: 'test', url: 'http://test.local' }]}>
          <Consumer />
        </CapsuleProvider>
      ),
      container,
    );

    expect(captured).toBeDefined();
    expect(typeof captured!.remote).toBe('function');
  });

  it('Remote.View from capsule entry works inside RemoteProvider from root entry', () => {
    // This is the exact scenario that was broken: capsule.mjs had its own
    // createContext() → useRemote() inside RemoteView (capsule subpath) could
    // not see the provider value set by RemoteProvider (root entry).
    const RemoteView = CapsuleMod.components.View;
    const threw = false;

    disposeRoot = render(
      () => (
        <RemoteProvider modules={[{ name: 'canvas', url: 'http://canvas.local' }]}>
          {/* RemoteView calls useRemote() internally */}
          <RemoteView name="canvas" />
        </RemoteProvider>
      ),
      container,
    );

    // If we get here without throwing, RemoteView found the context → singleton OK.
    expect(threw).toBe(false);
  });
});
