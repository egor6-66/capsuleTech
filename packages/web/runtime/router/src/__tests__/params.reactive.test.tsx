import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from '@tanstack/solid-router';
import { createEffect, createRoot } from 'solid-js';
import { describe, expect, it } from 'vitest';
import { wrap } from '../types';

/**
 * Real-router верификация `ICapsuleRouter.params()` / `param()`.
 *
 * В отличие от service.test.ts (мок `raw`), тут поднимается НАСТОЯЩИЙ
 * TanStack-роутер на mini route-tree с deep-link сегментом `rules/$ruleId`.
 * Цель — доказать инструментом (а не «на глаз»), что:
 *   1. `params()` отдаёт path-параметры leaf-матча реального совпадения;
 *   2. значение реактивно меняется при навигации `$ruleId: a → b` внутри
 *      Solid-реактивного scope БЕЗ ремаунта (эффект перезапускается, новое
 *      значение видно) — источник реактивности `raw.state` (Solid-memo TanStack,
 *      routerStores.createSolidReadonlyStore), тот же, что у `current()`.
 *
 * jsdom-env (vitest.config) — createRouter value-импортит solid-router; solid()
 * plugin трансформирует JSX, inline-deps тянут @tanstack/solid-router.
 */

const tick = () => new Promise((r) => setTimeout(r, 0));

const buildRouter = (initial: string) => {
  const rootRoute = createRootRoute();
  const indexRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/',
    component: () => null,
  });
  const ruleRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: 'rules/$ruleId',
    component: () => null,
  });
  const routeTree = rootRoute.addChildren([indexRoute, ruleRoute]);
  return createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: [initial] }),
  });
};

describe('wrap — params() on a real router', () => {
  it('returns leaf path params for a matched deep-link route', async () => {
    const raw = buildRouter('/rules/alpha');
    await raw.load();
    const w = wrap(raw as never);
    expect(w.params()).toEqual({ ruleId: 'alpha' });
    expect(w.param('ruleId')).toBe('alpha');
  });

  it('returns {} on a route without path params', async () => {
    const raw = buildRouter('/');
    await raw.load();
    const w = wrap(raw as never);
    expect(w.params()).toEqual({});
    expect(w.param('ruleId')).toBeUndefined();
  });

  it('reactively updates $ruleId a → b inside a Solid scope (no remount)', async () => {
    const raw = buildRouter('/rules/a');
    await raw.load();
    const w = wrap(raw as never);

    const seen: string[] = [];
    const dispose = createRoot((d) => {
      // Читаем param() внутри эффекта — подписка на raw.state (Solid-memo).
      createEffect(() => {
        seen.push(w.param('ruleId') ?? '<none>');
      });
      return d;
    });
    await tick(); // дать эффекту отработать первый раз

    expect(seen).toEqual(['a']);

    await raw.navigate({ to: '/rules/$ruleId', params: { ruleId: 'b' } });
    await tick(); // навигация async → дать state-memo и эффекту обновиться

    // Прямое чтение — новое значение.
    expect(w.param('ruleId')).toBe('b');
    // Эффект перезапустился с новым значением — реактивность подтверждена.
    expect(seen).toContain('b');

    dispose();
  });
});
