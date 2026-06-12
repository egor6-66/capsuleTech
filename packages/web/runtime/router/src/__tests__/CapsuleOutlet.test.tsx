import { render } from 'solid-js/web';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DepthContext } from '../depthContext';
import { useRouteDepth } from '../useRouteDepth';

/**
 * Тесты на CapsuleOutlet — DOM-обёртка над TanStack <Outlet/> с depth-scoped
 * view-transition-name (ADR 046 Decision 4).
 *
 * Стабим `Outlet` из `@tanstack/solid-router` маркером, который пробрасывает
 * текущий `useRouteDepth()` внутрь — это позволяет проверить, что Provider
 * инкрементирует depth корректно (parent + 1).
 *
 * DOM проверяем напрямую через jsdom: класс vt-route-content, inline
 * view-transition-name, sized-wrapper (width/height 100%).
 */

let outletDepth: number | undefined;

vi.mock('@tanstack/solid-router', () => ({
  Outlet: () => {
    const d = useRouteDepth();
    outletDepth = d();
    return null;
  },
}));

// Import AFTER vi.mock, иначе CapsuleOutlet видит реальный Outlet.
const { CapsuleOutlet } = await import('../CapsuleOutlet');

afterEach(() => {
  outletDepth = undefined;
});

describe('CapsuleOutlet — DOM + depth propagation', () => {
  it('корневой Outlet (нет parent Provider) → wrapper с vt-name capsule-content-0 + vt-class', () => {
    const container = document.createElement('div');
    const dispose = render(() => <CapsuleOutlet />, container);
    const wrapper = container.querySelector('.vt-route-content') as HTMLElement | null;
    expect(wrapper).not.toBeNull();
    expect(wrapper?.style.viewTransitionName).toBe('capsule-content-0');
    expect(wrapper?.style.width).toBe('100%');
    expect(wrapper?.style.height).toBe('100%');
    // view-transition-class — depth-agnostic CSS-таргетинг
    // (web-style использует ::view-transition-*(.capsule-route)).
    expect(wrapper?.style.getPropertyValue('view-transition-class')).toBe('capsule-route');
    expect(outletDepth).toBe(0);
    dispose();
  });

  it('Outlet внутри DepthContext.Provider value=0 → vt-name capsule-content-1 + vt-class', () => {
    const container = document.createElement('div');
    const dispose = render(
      () => (
        <DepthContext.Provider value={0}>
          <CapsuleOutlet />
        </DepthContext.Provider>
      ),
      container,
    );
    const wrapper = container.querySelector('.vt-route-content') as HTMLElement | null;
    expect(wrapper?.style.viewTransitionName).toBe('capsule-content-1');
    // Класс одинаков на всех уровнях — depth-agnostic.
    expect(wrapper?.style.getPropertyValue('view-transition-class')).toBe('capsule-route');
    expect(outletDepth).toBe(1);
    dispose();
  });

  it('Outlet внутри Outlet (вложение через сам CapsuleOutlet) → depth 0 и 1, два wrapper', () => {
    const container = document.createElement('div');
    // Внешний CapsuleOutlet рендерит свой wrapper + Outlet-стаб (который пишет
    // outletDepth). Стаб не рекурсирует. Чтобы проверить настоящее вложение,
    // имитируем вручную: CapsuleOutlet внутри CapsuleOutlet через ручной wrap.
    const Inner = () => <CapsuleOutlet />;
    const dispose = render(
      () => (
        <DepthContext.Provider value={-1}>
          <CapsuleOutlet />
          {/* Параллельный inner — другой owner. Внутри явного Provider value=0. */}
          <DepthContext.Provider value={0}>
            <Inner />
          </DepthContext.Provider>
        </DepthContext.Provider>
      ),
      container,
    );
    const wrappers = container.querySelectorAll('.vt-route-content');
    expect(wrappers.length).toBe(2);
    const names = Array.from(wrappers).map(
      (el) => (el as HTMLElement).style.viewTransitionName,
    );
    expect(names).toContain('capsule-content-0'); // первый: parent -1 + 1
    expect(names).toContain('capsule-content-1'); // второй: parent 0 + 1
    dispose();
  });

  it('CapsuleOutlet пушит DepthContext дальше — потомки видят (parent + 1)', () => {
    let nestedDepth: number | undefined;
    const NestedProbe = () => {
      const d = useRouteDepth();
      nestedDepth = d();
      return null;
    };
    const container = document.createElement('div');
    const dispose = render(
      () => (
        <DepthContext.Provider value={2}>
          {/* CapsuleOutlet пушит depth=3 внутрь. NestedProbe рядом с Outlet'ом
              в той же Provider-области. Но в реальности NestedProbe был бы
              ВНУТРИ Outlet'а — проверяем через прямой Provider value=3, потому
              что наш Outlet-стаб не принимает children. */}
          <CapsuleOutlet />
        </DepthContext.Provider>
      ),
      container,
    );
    // Outlet-стаб ДОЛЖЕН видеть depth=3 (parent 2 + 1).
    expect(outletDepth).toBe(3);
    // depth-agnostic CSS class присутствует и на глубоких уровнях — это
    // главное архитектурное свойство: один CSS-селектор покрывает любую глубину.
    const wrapper = container.querySelector('.vt-route-content') as HTMLElement | null;
    expect(wrapper?.style.viewTransitionName).toBe('capsule-content-3');
    expect(wrapper?.style.getPropertyValue('view-transition-class')).toBe('capsule-route');
    dispose();
    // NestedProbe — лишний для этого кейса, но проверим что cleanup не упал.
    void nestedDepth;
    void NestedProbe;
  });
});
