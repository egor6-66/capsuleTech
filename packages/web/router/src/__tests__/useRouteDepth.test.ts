import { createRoot } from 'solid-js';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// useRouteDepth() вызывает useMatches() из @tanstack/solid-router — value-импорт,
// который тянет CatchBoundary и другие клиентские API, падающие в node-env.
// Мокируем модуль целиком аналогично viewTransition.test.ts и notFoundRedirect.test.ts.
//
// useMatches с select-колбэком должен вернуть Accessor<number>.
// Мок возвращает createMemo(() => select(mockMatches)) — честный Solid Accessor.

vi.mock('@tanstack/solid-router', () => {
  const { createMemo } = require('solid-js');
  let _matches: unknown[] = [];
  const setMatches = (m: unknown[]) => {
    _matches = m;
  };
  const useMatches = vi.fn((opts?: { select?: (m: unknown[]) => unknown }) => {
    return createMemo(() => {
      const res = opts?.select ? opts.select(_matches) : _matches;
      return res;
    });
  });
  return { useMatches, __setMatches: setMatches };
});

let useRouteDepth: typeof import('../useRouteDepth').useRouteDepth;
let __setMatches: (m: unknown[]) => void;

beforeEach(async () => {
  vi.clearAllMocks();
  vi.resetModules();
  // Re-mock after resetModules — vi.mock hoisted mock persists but module instance resets
  const tanstack = await import('@tanstack/solid-router');
  __setMatches = (tanstack as any).__setMatches;
  const mod = await import('../useRouteDepth');
  useRouteDepth = mod.useRouteDepth;
});

describe('useRouteDepth — возвращает Accessor<number>', () => {
  it('depth = 0 при одном match (корневой маршрут)', () => {
    __setMatches([{ id: '__root__' }]);
    let depth: number | undefined;
    createRoot(() => {
      const d = useRouteDepth();
      depth = d();
    });
    expect(depth).toBe(0);
  });

  it('depth = 1 при двух matches (вложенный layout)', () => {
    __setMatches([{ id: '__root__' }, { id: '/workspace' }]);
    let depth: number | undefined;
    createRoot(() => {
      const d = useRouteDepth();
      depth = d();
    });
    expect(depth).toBe(1);
  });

  it('depth = 2 при трёх matches (вложенный layout + под-таб)', () => {
    __setMatches([{ id: '__root__' }, { id: '/workspace' }, { id: '/workspace/web-studio' }]);
    let depth: number | undefined;
    createRoot(() => {
      const d = useRouteDepth();
      depth = d();
    });
    expect(depth).toBe(2);
  });

  it('depth = 0 при пустом массиве matches (защита Math.max)', () => {
    __setMatches([]);
    let depth: number | undefined;
    createRoot(() => {
      const d = useRouteDepth();
      depth = d();
    });
    expect(depth).toBe(0);
  });

  it('возвращает функцию (Accessor)', () => {
    __setMatches([{ id: '__root__' }]);
    createRoot(() => {
      const d = useRouteDepth();
      expect(typeof d).toBe('function');
    });
  });
});
