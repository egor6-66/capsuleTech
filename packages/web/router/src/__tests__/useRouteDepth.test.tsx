import { createRoot } from 'solid-js';
import { render } from 'solid-js/web';
import { describe, expect, it } from 'vitest';
import { DepthContext } from '../depthContext';
import { useRouteDepth } from '../useRouteDepth';

/**
 * Тесты на per-Outlet depth-context (ADR 046 Decision 4 impl).
 *
 * Замещают legacy-моки `vi.mock('@tanstack/solid-router', { __setMatches })`,
 * которые проверяли `useMatches({ select: m => m.length - 1 })` — устаревший
 * глобально-семантичный подход PR #298 (см. ADR 046, Problem 4).
 *
 * Notes:
 *   - `useContext` обязан вызываться внутри компонент-функции/owner-scope.
 *     Поэтому здесь — `render()` от `solid-js/web` с jsdom DOM-target'ом.
 *     `createRoot` + прямой `useRouteDepth()` НЕ видит Provider, заданный
 *     через `<Ctx.Provider>` JSX (Provider устанавливает context только
 *     для children-owner'ов, не root).
 *   - DOM рендера тут не важен — нам нужен только context-effect.
 */

const Probe = (props: { onDepth: (d: number) => void }) => {
  const d = useRouteDepth();
  props.onDepth(d());
  return null;
};

describe('useRouteDepth — Provider-based depth resolution', () => {
  it('sentinel — нет Provider в дереве → depth 0', () => {
    let captured: number | undefined;
    const container = document.createElement('div');
    const dispose = render(() => <Probe onDepth={(d) => (captured = d)} />, container);
    expect(captured).toBe(0);
    dispose();
  });

  it('Provider value=0 (root Outlet) → depth 0', () => {
    let captured: number | undefined;
    const container = document.createElement('div');
    const dispose = render(
      () => (
        <DepthContext.Provider value={0}>
          <Probe onDepth={(d) => (captured = d)} />
        </DepthContext.Provider>
      ),
      container,
    );
    expect(captured).toBe(0);
    dispose();
  });

  it('Provider value=2 (depth уровня 2) → depth 2', () => {
    let captured: number | undefined;
    const container = document.createElement('div');
    const dispose = render(
      () => (
        <DepthContext.Provider value={2}>
          <Probe onDepth={(d) => (captured = d)} />
        </DepthContext.Provider>
      ),
      container,
    );
    expect(captured).toBe(2);
    dispose();
  });

  it('Вложенные Provider — берётся ближайший (inner overrides outer)', () => {
    let captured: number | undefined;
    const container = document.createElement('div');
    const dispose = render(
      () => (
        <DepthContext.Provider value={0}>
          <DepthContext.Provider value={1}>
            <DepthContext.Provider value={2}>
              <Probe onDepth={(d) => (captured = d)} />
            </DepthContext.Provider>
          </DepthContext.Provider>
        </DepthContext.Provider>
      ),
      container,
    );
    expect(captured).toBe(2);
    dispose();
  });

  it('возвращает Accessor (function) — реактивный API сохранён', () => {
    let accessor: (() => number) | undefined;
    createRoot((dispose) => {
      accessor = useRouteDepth();
      dispose();
    });
    expect(typeof accessor).toBe('function');
    expect(accessor?.()).toBe(0);
  });
});
