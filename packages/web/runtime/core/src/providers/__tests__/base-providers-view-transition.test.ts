/**
 * base-providers-view-transition.test.ts
 *
 * Проверяем, что BaseProviders корректно пробрасывает `viewTransition`
 * в `createRouter` из @capsuletech/web-router.
 *
 * Контракт:
 *  1. transition=true  → createRouter вызывается с { viewTransition: true }
 *  2. transition=false → createRouter вызывается с { viewTransition: false }
 *  3. transition='none' → createRouter вызывается с { viewTransition: false }
 *  4. transition=undefined → createRouter вызывается с { viewTransition: false }
 *
 * Мокаем @capsuletech/web-router, тонкие субпаты @capsuletech/web-profiler
 * (/providers + /reporters) и solid-js/web — хотим изолированный unit-тест без DOM.
 */

import type { createRouter } from '@capsuletech/web-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// ── Mocks ─────────────────────────────────────────────────────────────────────

const createRouterMock = vi.fn<typeof createRouter>(() => ({
  raw: { _mock: true } as any,
  capsuleRouter: {} as any,
}));

// Тонкий хаб профайлера (ADR 063 D5) — мок просто прокидывает children, чтобы
// убедиться что дерево ВСЕГДА обёрнуто в ProfilerProvider.
const profilerProviderMock = vi.fn((props: any) => props.children);

vi.mock('@capsuletech/web-router', () => ({
  createRouter: createRouterMock,
  RouterContext: { Provider: (props: any) => props.children },
  RouterProvider: () => null,
}));

vi.mock('@capsuletech/web-profiler/providers', () => ({
  ProfilerProvider: profilerProviderMock,
}));

vi.mock('@capsuletech/web-profiler/reporters', () => ({
  TraceConsoleReporter: () => null,
}));

// Мокаем Solid — BaseProviders использует Show / JSX; в node-env рендер не нужен,
// нас интересует только факт вызова createRouter с нужными opts.
// Мокаем Show чтобы немедленно вызвать children с routeTree.
vi.mock('solid-js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('solid-js')>();
  return {
    ...actual,
    Show: (props: any) => {
      // Если when truthy — вызываем children как функцию (паттерн <Show when={x}>{(x) => ...}</Show>)
      if (props.when) {
        return typeof props.children === 'function'
          ? props.children(() => props.when)
          : props.children;
      }
      return props.fallback ?? null;
    },
  };
});

// ── Tests ─────────────────────────────────────────────────────────────────────

let BaseProviders: typeof import('../base').BaseProviders;

beforeEach(async () => {
  vi.clearAllMocks();
  vi.resetModules();
  const mod = await import('../base');
  BaseProviders = mod.BaseProviders;
});

const fakeRouteTree = { options: {} } as any;

describe('BaseProviders — viewTransition проводка в createRouter', () => {
  it('1. transition=true → viewTransition: true', async () => {
    BaseProviders({ routeTree: fakeRouteTree, transition: true });
    expect(createRouterMock).toHaveBeenCalledOnce();
    expect(createRouterMock.mock.calls[0][0]).toMatchObject({ viewTransition: true });
  });

  it('2. transition=false → viewTransition: false', async () => {
    BaseProviders({ routeTree: fakeRouteTree, transition: false });
    expect(createRouterMock).toHaveBeenCalledOnce();
    expect(createRouterMock.mock.calls[0][0]).toMatchObject({ viewTransition: false });
  });

  it("3. transition='none' → viewTransition: false", async () => {
    BaseProviders({ routeTree: fakeRouteTree, transition: 'none' });
    expect(createRouterMock).toHaveBeenCalledOnce();
    expect(createRouterMock.mock.calls[0][0]).toMatchObject({ viewTransition: false });
  });

  it('4. transition=undefined → viewTransition: false', async () => {
    BaseProviders({ routeTree: fakeRouteTree });
    expect(createRouterMock).toHaveBeenCalledOnce();
    expect(createRouterMock.mock.calls[0][0]).toMatchObject({ viewTransition: false });
  });
});

describe('BaseProviders — тонкий профайлер-хаб всегда смонтирован', () => {
  it('оборачивает дерево в ProfilerProvider без флага (trace-канал во всех аппах)', () => {
    BaseProviders({ routeTree: fakeRouteTree });
    expect(profilerProviderMock).toHaveBeenCalledOnce();
  });

  it('обёртка не зависит от роута — хаб монтится и на fallback-ветке (нет routeTree)', () => {
    BaseProviders({ children: null });
    expect(profilerProviderMock).toHaveBeenCalledOnce();
  });
});
