import { render } from 'solid-js/web';
import { afterEach, describe, expect, it, vi } from 'vitest';

/**
 * Тесты на trace-инструментацию Page-wrapper (ADR 062).
 *
 * Page-обёртка эмиттит `web-core.page` mount при инстанциации leaf-Page и
 * `web-core.page` dispose при его размонтаже — постоянно, no-op когда канал off.
 * `id` (createUniqueId) парит mount↔dispose, считает живые инстансы.
 *
 * Мокаем `@capsuletech/web-profiler/trace` шпионом — считаем фазы и проверяем,
 * что dispose несёт тот же `id`, что и mount.
 */

const { traceSpy } = vi.hoisted(() => ({ traceSpy: vi.fn() }));

vi.mock('@capsuletech/web-profiler/trace', () => ({
  trace: (node: string, phase: string, data?: unknown) => traceSpy(node, phase, data),
}));

// Import AFTER vi.mock.
const { PageWrapper } = await import('../page');

afterEach(() => {
  traceSpy.mockClear();
});

describe('Page-wrapper — trace-инструментация', () => {
  it('эмиттит web-core.page mount при инстанциации с id', () => {
    const Page = PageWrapper(() => null);
    const container = document.createElement('div');
    const dispose = render(() => <Page />, container);

    const mountCall = traceSpy.mock.calls.find(
      ([node, phase]) => node === 'web-core.page' && phase === 'mount',
    );
    expect(mountCall).toBeDefined();
    expect(mountCall?.[2]).toEqual({ id: expect.any(String) });
    dispose();
  });

  it('эмиттит web-core.page dispose с тем же id при размонтаже', () => {
    const Page = PageWrapper(() => null);
    const container = document.createElement('div');
    const dispose = render(() => <Page />, container);

    const mountId = traceSpy.mock.calls.find(
      ([node, phase]) => node === 'web-core.page' && phase === 'mount',
    )?.[2] as { id: string };

    traceSpy.mockClear();
    dispose();

    expect(traceSpy).toHaveBeenCalledWith('web-core.page', 'dispose', { id: mountId.id });
  });

  it('каждый инстанс Page получает уникальный id (двойной mount виден)', () => {
    const Page = PageWrapper(() => null);
    const container = document.createElement('div');
    const dispose = render(
      () => (
        <>
          <Page />
          <Page />
        </>
      ),
      container,
    );

    const mountIds = traceSpy.mock.calls
      .filter(([node, phase]) => node === 'web-core.page' && phase === 'mount')
      .map(([, , data]) => (data as { id: string }).id);

    expect(mountIds).toHaveLength(2);
    expect(new Set(mountIds).size).toBe(2);
    dispose();
  });
});
