import { beforeEach, describe, expect, it, vi } from 'vitest';

// Тестируем проводку `beforeLoad` в `createRouter`.
//
// `createRouter` value-импортит `@tanstack/solid-router` (тянет клиентский Solid-код),
// поэтому в node-env мокаем весь модуль — аналогично паттерну notFoundRedirect.test.ts.
//
// Контракт, который проверяем:
//   - если `beforeLoad` задан → он оказывается в `routeTree.options.beforeLoad`
//     ДО передачи дерева в `createTanStackRouter`
//   - если `beforeLoad` не задан → `routeTree.options.beforeLoad` не изменяется
//   - существующий `notFoundRedirect` не ломается при наличии `beforeLoad`

vi.mock('@tanstack/solid-router', () => {
  const createRouterMock = vi.fn((opts: Record<string, unknown>) => ({
    _opts: opts,
    navigate: vi.fn(),
    state: { location: { pathname: '/' } },
    history: { back: vi.fn() },
    options: {},
  }));
  const NavigateMock = (props: { to: string; replace?: boolean }) => props;
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

/** Фабрика фиктивного routeTree — объект с mutable `.options` как в реальном Route. */
const makeRouteTree = (existingBeforeLoad?: unknown) => {
  return {
    options: {
      ...(existingBeforeLoad !== undefined ? { beforeLoad: existingBeforeLoad } : {}),
    },
  } as any;
};

describe('createRouter — beforeLoad не задан', () => {
  it('не изменяет routeTree.options.beforeLoad (остаётся undefined)', async () => {
    const routeTree = makeRouteTree();
    createRouter({ routeTree });
    expect(routeTree.options.beforeLoad).toBeUndefined();
  });

  it('не изменяет существующий beforeLoad на routeTree', async () => {
    const existing = vi.fn();
    const routeTree = makeRouteTree(existing);
    createRouter({ routeTree });
    // opts.beforeLoad не задан → существующий хук должен остаться нетронутым
    expect(routeTree.options.beforeLoad).toBe(existing);
  });

  it('по-прежнему возвращает { raw, capsuleRouter }', async () => {
    const result = createRouter({ routeTree: makeRouteTree() });
    expect(result).toHaveProperty('raw');
    expect(result).toHaveProperty('capsuleRouter');
  });
});

describe('createRouter — beforeLoad задан', () => {
  it('записывает колбэк в routeTree.options.beforeLoad до createTanStackRouter', async () => {
    const guard = vi.fn();
    const routeTree = makeRouteTree();

    // Захватываем значение .options.beforeLoad в момент вызова createTanStackRouter
    const { createRouter: createTanStackRouter } = await import('@tanstack/solid-router');
    let capturedBeforeLoad: unknown;
    vi.mocked(createTanStackRouter).mockImplementationOnce(() => {
      // В момент вызова TanStack — beforeLoad уже должен быть на routeTree.options
      capturedBeforeLoad = routeTree.options.beforeLoad;
      return {
        _opts: {},
        navigate: vi.fn(),
        state: { location: { pathname: '/' } },
        history: { back: vi.fn() },
        options: {},
      } as any;
    });

    createRouter({ routeTree, beforeLoad: guard });

    expect(routeTree.options.beforeLoad).toBe(guard);
    expect(capturedBeforeLoad).toBe(guard);
  });

  it('передаёт именно тот колбэк, что задан в opts', async () => {
    const guard = vi.fn(async ({ location }: { location: { pathname: string } }) => {
      if (location.pathname === '/secret') {
        throw new Error('redirect!');
      }
    });
    const routeTree = makeRouteTree();
    createRouter({ routeTree, beforeLoad: guard });
    expect(routeTree.options.beforeLoad).toBe(guard);
  });

  it('перезаписывает уже существующий beforeLoad на routeTree', async () => {
    const existing = vi.fn();
    const newGuard = vi.fn();
    const routeTree = makeRouteTree(existing);
    createRouter({ routeTree, beforeLoad: newGuard });
    expect(routeTree.options.beforeLoad).toBe(newGuard);
    expect(routeTree.options.beforeLoad).not.toBe(existing);
  });

  it('совместим с одновременно заданным notFoundRedirect', async () => {
    const { createRouter: createTanStackRouter } = await import('@tanstack/solid-router');
    const guard = vi.fn();
    const routeTree = makeRouteTree();

    createRouter({ routeTree, beforeLoad: guard, notFoundRedirect: '/home' });

    const mock = vi.mocked(createTanStackRouter);
    expect(mock).toHaveBeenCalledOnce();
    const tanstackOpts = mock.mock.calls[0][0] as Record<string, unknown>;
    // notFoundRedirect проводится через defaultNotFoundComponent
    expect(typeof tanstackOpts.defaultNotFoundComponent).toBe('function');
    // beforeLoad — на routeTree, не в опциях TanStack
    expect(routeTree.options.beforeLoad).toBe(guard);
  });

  it('возвращает { raw, capsuleRouter }', async () => {
    const guard = vi.fn();
    const result = createRouter({ routeTree: makeRouteTree(), beforeLoad: guard });
    expect(result).toHaveProperty('raw');
    expect(result).toHaveProperty('capsuleRouter');
  });
});
