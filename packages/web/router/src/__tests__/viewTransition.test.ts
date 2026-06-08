import { beforeEach, describe, expect, it, vi } from 'vitest';

// Тестируем проводку `viewTransition` в `createRouter`.
//
// Та же стратегия мокирования что и в notFoundRedirect.test.ts:
// `@tanstack/solid-router` мокается целиком, перехватываем вызов
// `createTanStackRouter` и проверяем переданные опции.

vi.mock('@tanstack/solid-router', () => {
  const createRouterMock = vi.fn((opts: Record<string, unknown>) => ({
    _opts: opts,
    navigate: vi.fn(),
    state: { location: { pathname: '/' } },
    history: { back: vi.fn() },
    options: {},
  }));
  const NavigateMock = vi.fn();
  return {
    createRouter: createRouterMock,
    Navigate: NavigateMock,
  };
});

let createRouter: typeof import('../service').createRouter;

beforeEach(async () => {
  vi.clearAllMocks();
  vi.resetModules();
  const mod = await import('../service');
  createRouter = mod.createRouter;
});

const makeRouteTree = () => ({}) as any;

describe('createRouter — viewTransition не задан', () => {
  it('не передаёт defaultViewTransition в TanStack', async () => {
    const { createRouter: createTanStackRouter } = await import('@tanstack/solid-router');
    createRouter({ routeTree: makeRouteTree() });

    const mock = vi.mocked(createTanStackRouter);
    const opts = mock.mock.calls[0][0] as Record<string, unknown>;
    expect(opts.defaultViewTransition).toBeUndefined();
  });

  it('viewTransition: false — не передаёт defaultViewTransition', async () => {
    const { createRouter: createTanStackRouter } = await import('@tanstack/solid-router');
    createRouter({ routeTree: makeRouteTree(), viewTransition: false });

    const mock = vi.mocked(createTanStackRouter);
    const opts = mock.mock.calls[0][0] as Record<string, unknown>;
    expect(opts.defaultViewTransition).toBeUndefined();
  });
});

describe('createRouter — viewTransition: true', () => {
  it('передаёт defaultViewTransition: true в TanStack', async () => {
    const { createRouter: createTanStackRouter } = await import('@tanstack/solid-router');
    createRouter({ routeTree: makeRouteTree(), viewTransition: true });

    const mock = vi.mocked(createTanStackRouter);
    expect(mock).toHaveBeenCalledOnce();
    const opts = mock.mock.calls[0][0] as Record<string, unknown>;
    expect(opts.defaultViewTransition).toBe(true);
  });

  it('возвращает { raw, capsuleRouter } при viewTransition: true', async () => {
    const result = createRouter({ routeTree: makeRouteTree(), viewTransition: true });
    expect(result).toHaveProperty('raw');
    expect(result).toHaveProperty('capsuleRouter');
  });
});
