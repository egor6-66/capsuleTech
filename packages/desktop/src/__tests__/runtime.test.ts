/**
 * Smoke tests for useDesktop() hook (src/runtime.ts).
 *
 * Tests verify:
 * 1. useDesktop() is exported and callable.
 * 2. `available` reflects presence of globalThis.__TAURI_INTERNALS__.
 * 3. All expected surface properties exist on the returned object.
 *
 * We do NOT test actual invoke/listen/dialog.open calls — those require a
 * live Tauri webview with dynamic @tauri-apps/* resolution. In jsdom that is
 * not possible and would require network-level mocking outside scope.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { useDesktop } from '../runtime';

describe('useDesktop()', () => {
  describe('when running outside Tauri (no __TAURI_INTERNALS__)', () => {
    beforeEach(() => {
      // Ensure the marker is absent
      // biome-ignore lint/performance/noDelete: test teardown
      delete (globalThis as Record<string, unknown>).__TAURI_INTERNALS__;
    });

    it('exports useDesktop as a function', () => {
      expect(typeof useDesktop).toBe('function');
    });

    it('returns an object', () => {
      const desktop = useDesktop();
      expect(desktop).toBeDefined();
      expect(typeof desktop).toBe('object');
    });

    it('available is false', () => {
      const desktop = useDesktop();
      expect(desktop.available).toBe(false);
    });

    it('exposes invoke as a function', () => {
      const desktop = useDesktop();
      expect(typeof desktop.invoke).toBe('function');
    });

    it('exposes listen as a function', () => {
      const desktop = useDesktop();
      expect(typeof desktop.listen).toBe('function');
    });

    it('exposes dialog.open as a function', () => {
      const desktop = useDesktop();
      expect(typeof desktop.dialog?.open).toBe('function');
    });

    it('invoke throws DesktopNotAvailableError outside Tauri', async () => {
      const desktop = useDesktop();
      await expect(desktop.invoke('any_command')).rejects.toThrow(
        'Desktop runtime is not available — running outside Tauri.',
      );
    });

    it('listen throws DesktopNotAvailableError outside Tauri', async () => {
      const desktop = useDesktop();
      await expect(desktop.listen('some-event', () => {})).rejects.toThrow(
        'Desktop runtime is not available — running outside Tauri.',
      );
    });

    it('dialog.open throws DesktopNotAvailableError outside Tauri', async () => {
      const desktop = useDesktop();
      await expect(desktop.dialog.open()).rejects.toThrow(
        'Desktop runtime is not available — running outside Tauri.',
      );
    });
  });

  describe('when running inside Tauri (__TAURI_INTERNALS__ present)', () => {
    beforeEach(() => {
      // Simulate Tauri presence by injecting the sentinel object
      (globalThis as Record<string, unknown>).__TAURI_INTERNALS__ = {
        metadata: { currentWindow: { label: 'main' } },
      };
    });

    afterEach(() => {
      // biome-ignore lint/performance/noDelete: test teardown
      delete (globalThis as Record<string, unknown>).__TAURI_INTERNALS__;
    });

    it('available is true', () => {
      const desktop = useDesktop();
      expect(desktop.available).toBe(true);
    });

    it('all surface methods still exist', () => {
      const desktop = useDesktop();
      expect(typeof desktop.invoke).toBe('function');
      expect(typeof desktop.listen).toBe('function');
      expect(typeof desktop.dialog.open).toBe('function');
    });
  });
});
