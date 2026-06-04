import { beforeEach, describe, expect, it, vi } from 'vitest';

// Тестируем логику проводки `notFoundRedirect` в `createRouter`.
//
// `createRouter` value-импортит `@tanstack/solid-router` (тянет клиентский Solid-код),
// поэтому в node-env мы мокаем весь модуль. Mock-фабрика перехватывает вызов
// `createTanStackRouter` и позволяет проверить, с какими опциями он был вызван —
// именно это и тестирует наш контракт:
//   - если `notFoundRedirect` задан → TanStack получает `defaultNotFoundComponent`
//   - если не задан → `defaultNotFoundComponent` отсутствует в опциях

// Флаг: был ли вызван Navigate (замоканный)
const navigateSpy = vi.fn();

vi.mock('@tanstack/solid-router', () => {
  const createRouterMock = vi.fn((opts: Record<string, unknown>) => ({
    _opts: opts,
    navigate: vi.fn(),
    state: { location: { pathname: '/' } },
    history: { back: vi.fn() },
    options: {},
  }));
  const NavigateMock = (props: { to: string; replace?: boolean }) => {
    navigateSpy(props);
    return null;
  };
  return {
    createRouter: createRouterMock,
    Navigate: NavigateMock,
  };
});

// После мока подтягиваем модуль. Динамический импорт (await import) необходим,
// чтобы mock успел примениться до загрузки service.ts (hoisting vitest).
let createRouter: typeof import('../service').createRouter;

beforeEach(async () => {
  vi.clearAllMocks();
  // Сбрасываем модульный кэш, чтобы каждый тест получал свежий инстанс.
  vi.resetModules();
  const mod = await import('../service');
  createRouter = mod.createRouter;
});

const makeRouteTree = () => ({}) as any;

describe('createRouter — notFoundRedirect не задан', () => {
  it('не передаёт defaultNotFoundComponent в TanStack', async () => {
    const { createRouter: createTanStackRouter } = await import('@tanstack/solid-router');
    createRouter({ routeTree: makeRouteTree() });

    const mock = vi.mocked(createTanStackRouter);
    expect(mock).toHaveBeenCalledOnce();
    const opts = mock.mock.calls[0][0] as Record<string, unknown>;
    expect(opts.defaultNotFoundComponent).toBeUndefined();
  });

  it('возвращает { raw, capsuleRouter } без изменения поведения', async () => {
    const result = createRouter({ routeTree: makeRouteTree() });
    expect(result).toHaveProperty('raw');
    expect(result).toHaveProperty('capsuleRouter');
  });
});

describe('createRouter — notFoundRedirect задан', () => {
  it('передаёт defaultNotFoundComponent в TanStack', async () => {
    const { createRouter: createTanStackRouter } = await import('@tanstack/solid-router');
    createRouter({ routeTree: makeRouteTree(), notFoundRedirect: '/dashboard' });

    const mock = vi.mocked(createTanStackRouter);
    expect(mock).toHaveBeenCalledOnce();
    const opts = mock.mock.calls[0][0] as Record<string, unknown>;
    expect(typeof opts.defaultNotFoundComponent).toBe('function');
  });

  it('defaultNotFoundComponent вызывает Navigate с to и replace=true', async () => {
    const { createRouter: createTanStackRouter } = await import('@tanstack/solid-router');
    createRouter({ routeTree: makeRouteTree(), notFoundRedirect: '/login' });

    const mock = vi.mocked(createTanStackRouter);
    const opts = mock.mock.calls[0][0] as Record<string, unknown>;
    // Вызываем компонент вручную — он должен делегировать в Navigate
    const component = opts.defaultNotFoundComponent as () => unknown;
    component();
    expect(navigateSpy).toHaveBeenCalledWith({ to: '/login', replace: true });
  });

  it('разные значения пути передаются как есть', async () => {
    const { createRouter: createTanStackRouter } = await import('@tanstack/solid-router');
    createRouter({ routeTree: makeRouteTree(), notFoundRedirect: '/home' });

    const mock = vi.mocked(createTanStackRouter);
    const opts = mock.mock.calls[0][0] as Record<string, unknown>;
    const component = opts.defaultNotFoundComponent as () => unknown;
    component();
    expect(navigateSpy).toHaveBeenCalledWith({ to: '/home', replace: true });
  });
});
