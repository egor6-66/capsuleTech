import { render } from 'solid-js/web';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { RouterContext } from '../context';
import { DepthContext } from '../depthContext';
import type { ICapsuleRouter } from '../types';

/**
 * Тесты на trace-инструментацию CapsuleOutlet (ADR 062).
 *
 * CapsuleOutlet эмиттит `router.route` mount при появлении outlet-узла в дереве
 * и `router.route` dispose при его удалении — постоянно, no-op когда канал off.
 *
 * Стабим `Outlet` (TanStack) в null и мокаем `@capsuletech/web-profiler/trace`
 * шпионом — считаем фазы и проверяем payload `{ depth, path }`.
 */

const { traceSpy } = vi.hoisted(() => ({ traceSpy: vi.fn() }));

vi.mock('@capsuletech/web-profiler/trace', () => ({
  trace: (node: string, phase: string, data?: unknown) => traceSpy(node, phase, data),
}));

vi.mock('@tanstack/solid-router', () => ({
  Outlet: () => null,
}));

// Import AFTER vi.mock.
const { CapsuleOutlet } = await import('../CapsuleOutlet');

afterEach(() => {
  traceSpy.mockClear();
});

describe('CapsuleOutlet — trace-инструментация', () => {
  it('эмиттит router.route mount при монтаже с depth+path', () => {
    const fakeRouter = { current: () => '/workspace/web-studio/store' } as ICapsuleRouter;
    const container = document.createElement('div');
    const dispose = render(
      () => (
        <RouterContext.Provider value={fakeRouter}>
          <DepthContext.Provider value={2}>
            <CapsuleOutlet />
          </DepthContext.Provider>
        </RouterContext.Provider>
      ),
      container,
    );
    expect(traceSpy).toHaveBeenCalledWith('router.route', 'mount', {
      depth: 3,
      path: '/workspace/web-studio/store',
    });
    dispose();
  });

  it('эмиттит router.route dispose при размонтаже', () => {
    const fakeRouter = { current: () => '/x' } as ICapsuleRouter;
    const container = document.createElement('div');
    const dispose = render(
      () => (
        <RouterContext.Provider value={fakeRouter}>
          <CapsuleOutlet />
        </RouterContext.Provider>
      ),
      container,
    );
    traceSpy.mockClear();
    dispose();
    expect(traceSpy).toHaveBeenCalledWith('router.route', 'dispose', {
      depth: 0,
      path: '/x',
    });
  });

  it('без RouterContext (soft-dep) path=undefined, trace всё равно эмиттит', () => {
    const container = document.createElement('div');
    const dispose = render(() => <CapsuleOutlet />, container);
    expect(traceSpy).toHaveBeenCalledWith('router.route', 'mount', {
      depth: 0,
      path: undefined,
    });
    dispose();
  });
});
