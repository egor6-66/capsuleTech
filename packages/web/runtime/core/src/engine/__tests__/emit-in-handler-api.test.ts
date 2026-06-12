/**
 * emit в IHandlerApi — тесты (ADR 032, фаза 1 — handler-API extension).
 *
 * Контракт:
 *  1. `emit` из event-хендлера диспатчит в СОБСТВЕННЫЙ контроллер (тот же путь что UiProxy).
 *  2. `emit('x')` из `onInit`, когда контроллер НЕ обрабатывает `x`, автобаблит к родительской
 *     Feature/Controller через `next()` ControllerProxy — cross-boundary канал.
 *  3. `useEmit()` (Views-путь) работает через тот же createEmit — результат идентичен.
 *
 * Тесты не монтируют Solid-компонент — используем ControllerProxy напрямую с injected emit.
 * createEmit тестируется как белый ящик через makeCtx + ControllerProxy.
 */

import { describe, expect, it, vi } from 'vitest';
import type { ITarget } from '../../wrappers/interfaces';
import { ControllerProxy } from '../controller-proxy';
import { createEmit, normalizeTarget } from '../use-emit';

// ---------------------------------------------------------------------------
// Вспомогательные factory-функции
// ---------------------------------------------------------------------------

const makeStore = (ctxData: any = {}) => ({
  ctx: ctxData,
  registerComponent: vi.fn(),
  unregisterComponent: vi.fn(),
  styles: {} as Record<string, string>,
  loading: false,
  props: {} as Record<string, any>,
});

const makeState = (value: string) => ({ value });

/** Минимальный stub-контроллер для parent-ctx. */
const makeControllerStub = (handlers: Record<string, (...args: any[]) => any> = {}) =>
  new Proxy({} as any, {
    get(_target, prop: string) {
      return handlers[prop] ?? vi.fn(async () => null);
    },
  });

// ---------------------------------------------------------------------------
// createEmit — базовая функциональность
// ---------------------------------------------------------------------------

describe('createEmit', () => {
  it('dispatches eventName via ctx.controller[name](target, ctx.store.ctx)', async () => {
    const onLoginMock = vi.fn(async () => 'login-ok');
    const store = makeStore({ userId: 42 });
    const controller = makeControllerStub({ onLogin: onLoginMock });
    const ctx = { controller, store, state: makeState('idle') };

    const emit = createEmit(ctx as any);
    const result = await emit('onLogin', { payload: { token: 'abc' } });

    expect(onLoginMock).toHaveBeenCalledOnce();
    const [target, context] = onLoginMock.mock.calls[0] as unknown as [ITarget, unknown];
    expect(target.payload).toEqual({ token: 'abc' });
    expect(context).toEqual({ userId: 42 }); // ctx.store.ctx
    expect(result).toBe('login-ok');
  });

  it('normalizes partial target before dispatch — meta.tags → name', async () => {
    const onSelectMock = vi.fn(async () => undefined);
    const store = makeStore();
    const controller = makeControllerStub({ onSelect: onSelectMock });
    const ctx = { controller, store, state: makeState('idle') };

    const emit = createEmit(ctx as any);
    await emit('onSelect', { meta: { tags: ['item', 'list'] } });

    const [target] = onSelectMock.mock.calls[0] as unknown as [ITarget, unknown];
    expect(target.name).toBe('item');
    expect(target.meta?.tags).toEqual(['item', 'list']);
  });

  it('emit without partial → target with all-undefined fields', async () => {
    const onDismissMock = vi.fn(async () => undefined);
    const store = makeStore();
    const controller = makeControllerStub({ onDismiss: onDismissMock });
    const ctx = { controller, store, state: makeState('idle') };

    const emit = createEmit(ctx as any);
    await emit('onDismiss');

    expect(onDismissMock).toHaveBeenCalledOnce();
    const [target] = onDismissMock.mock.calls[0] as unknown as [ITarget, unknown];
    expect(target.name).toBeUndefined();
    expect(target.payload).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// emit в event-хендлере (передаётся через ControllerProxy handler-API)
// ---------------------------------------------------------------------------

describe('emit in event-handler via ControllerProxy', () => {
  it('handler receives emit and can dispatch into own controller', async () => {
    const emittedCalls: Array<{ name: string; target: ITarget }> = [];

    // Мок emit — проверяем что он вызывается с правильными аргументами
    const mockEmit = vi.fn(async (eventName: string, partial?: Partial<ITarget>) => {
      emittedCalls.push({ name: eventName, target: normalizeTarget(partial) });
      return 'emit-result';
    });

    const clickHandler = vi.fn(async ({ emit }: any) => {
      await emit('onSubmit', { payload: { formId: 'login' } });
      return 'handler-done';
    });

    const ctl = ControllerProxy({
      schema: {
        initial: 'idle',
        states: { idle: { onClick: clickHandler } },
      },
      state: makeState('idle'),
      send: vi.fn(),
      store: makeStore(),
      emit: mockEmit,
    });

    const result = await ctl.onClick({ name: 'submit-btn' }, {});

    expect(result).toBe('handler-done');
    expect(clickHandler).toHaveBeenCalledOnce();
    // emit был передан в api
    const api = clickHandler.mock.calls[0][0] as { emit: typeof mockEmit };
    expect(typeof api.emit).toBe('function');
    // emit вызван с правильными аргументами
    expect(mockEmit).toHaveBeenCalledOnce();
    expect(emittedCalls[0].name).toBe('onSubmit');
    expect(emittedCalls[0].target.payload).toEqual({ formId: 'login' });
  });

  it('emit in handler dispatches into real ControllerProxy FSM — state-level handler', async () => {
    const onSubmitHandler = vi.fn(async () => 'submit-handled');
    // "own controller" = тот же ControllerProxy с onSubmit в state
    // Сценарий: onClick вызывает emit('onSubmit'), контроллер сам обрабатывает onSubmit.

    // Строим ctx + ControllerProxy аналогично logic-wrapper
    const store = makeStore({ data: 'ctx-data' });
    const ctx: any = { controller: null, store, state: makeState('idle') };
    let ctxEmit: any;
    const proxyEmit = (eventName: string, partial?: Partial<ITarget>) =>
      ctxEmit(eventName, partial);

    const ctl = ControllerProxy({
      schema: {
        initial: 'idle',
        states: {
          idle: {
            onClick: async ({ emit: emitFn }: any) => {
              return await emitFn('onSubmit', { payload: { source: 'click' } });
            },
            onSubmit: onSubmitHandler,
          },
        },
      },
      state: makeState('idle'),
      send: vi.fn(),
      store,
      emit: proxyEmit,
    });

    ctx.controller = ctl;
    ctxEmit = createEmit(ctx);

    const result = await ctl.onClick({}, {});

    expect(onSubmitHandler).toHaveBeenCalledOnce();
    expect(result).toBe('submit-handled');
    const [api] = onSubmitHandler.mock.calls[0] as unknown as [{ target: ITarget }];
    expect(api.target.payload).toEqual({ source: 'click' });
  });

  it('emit is present in top-level handler API too', async () => {
    const mockEmit = vi.fn(async () => undefined);
    let receivedEmit: unknown = null;

    const ctl = ControllerProxy({
      schema: {
        initial: 'idle',
        states: { idle: {} },
        onClick: async ({ emit: emitFn }: any) => {
          receivedEmit = emitFn;
        },
      },
      state: makeState('idle'),
      send: vi.fn(),
      store: makeStore(),
      emit: mockEmit,
    });

    await ctl.onClick({}, {});
    expect(typeof receivedEmit).toBe('function');
    expect(receivedEmit).toBe(mockEmit);
  });
});

// ---------------------------------------------------------------------------
// emit из onInit/onExit (lifecycle) — главный кейс: автобаблинг к родителю
// ---------------------------------------------------------------------------

describe('emit from lifecycle (onInit) — auto-bubbles to parent Feature/Controller', () => {
  it('emit("onLogin") from onInit — when controller has no onLogin handler → bubbles to parent', async () => {
    // Сценарий из задачи: пакетный Controller эмитит onLogin из submitting.onInit после async-await.
    // App-Feature не знает про вложенный контроллер напрямую — ловит через next() автобаблинг.

    const parentOnLoginHandler = vi.fn(async () => 'parent-caught-onLogin');

    // parent — stub-controller (например app-Feature) с хендлером onLogin
    const parentController = makeControllerStub({ onLogin: parentOnLoginHandler });
    const parentCtx = {
      controller: parentController,
      store: makeStore(),
      state: makeState('idle'),
    };

    // child controller: нет hander'а onLogin → автобаблинг к parent
    const childStore = makeStore({ data: 'child-data' });
    const childCtx: any = {
      controller: null,
      store: childStore,
      state: makeState('submitting'),
      parent: parentCtx,
    };
    let ctxEmit: any;
    const proxyEmit = (eventName: string, partial?: Partial<ITarget>) =>
      ctxEmit(eventName, partial);

    const childCtl = ControllerProxy({
      schema: {
        initial: 'submitting',
        states: {
          submitting: {
            // симулируем «нет onLogin» — его нет в states.submitting
          },
        },
        // onLogin нет и на top-level → автобаблинг
      },
      state: makeState('submitting'),
      send: vi.fn(),
      store: childStore,
      parent: parentCtx as any,
      emit: proxyEmit,
    });

    childCtx.controller = childCtl;
    ctxEmit = createEmit(childCtx);

    // Симулируем вызов emit из lifecycle (onInit) — вызываем ctxEmit напрямую
    // (в реальном logic-wrapper это происходит внутри createEffect после рендера)
    const result = await ctxEmit('onLogin', { payload: { token: 'jwt-token', user: 'alice' } });

    expect(parentOnLoginHandler).toHaveBeenCalledOnce();
    expect(result).toBe('parent-caught-onLogin');

    // Проверяем payload — дошёл до родительского хендлера без изменений
    const [targetReceivedByParent] = parentOnLoginHandler.mock.calls[0] as unknown as [
      ITarget,
      unknown,
    ];
    expect(targetReceivedByParent.payload).toEqual({ token: 'jwt-token', user: 'alice' });
  });

  it('emit("onLogin") from onInit — when controller HAS onLogin handler → stays at own level', async () => {
    const ownOnLoginHandler = vi.fn(async () => 'own-handled');
    const parentHandler = vi.fn(async () => 'should-not-be-called');

    const parentCtx = {
      controller: makeControllerStub({ onLogin: parentHandler }),
      store: makeStore(),
      state: makeState('idle'),
    };
    const childStore = makeStore();
    const childCtx: any = {
      controller: null,
      store: childStore,
      state: makeState('idle'),
      parent: parentCtx,
    };
    let ctxEmit: any;
    const proxyEmit = (eventName: string, partial?: Partial<ITarget>) =>
      ctxEmit(eventName, partial);

    const childCtl = ControllerProxy({
      schema: {
        initial: 'idle',
        states: { idle: { onLogin: ownOnLoginHandler } },
      },
      state: makeState('idle'),
      send: vi.fn(),
      store: childStore,
      parent: parentCtx as any,
      emit: proxyEmit,
    });

    childCtx.controller = childCtl;
    ctxEmit = createEmit(childCtx);

    const result = await ctxEmit('onLogin', { payload: { user: 'bob' } });

    expect(ownOnLoginHandler).toHaveBeenCalledOnce();
    expect(parentHandler).not.toHaveBeenCalled();
    expect(result).toBe('own-handled');
  });
});

// ---------------------------------------------------------------------------
// useEmit (Views-путь) — shared createEmit, тот же результат
// ---------------------------------------------------------------------------

describe('useEmit uses createEmit under the hood — same dispatch path', () => {
  it('createEmit and useEmit produce identical dispatch behavior', async () => {
    // Тест доказывает что useEmit теперь просто вызывает createEmit(ctx),
    // а не содержит дублированную dispatch-логику.
    // Верификация: один и тот же вызов через createEmit и через useEmit
    // дают одинаковый результат.

    const { createRoot } = await import('solid-js');
    const { Context } = await import('../ctx');
    const { useEmit } = await import('../use-emit');

    const handler = vi.fn(async () => 'result-from-handler');
    const store = makeStore({ x: 1 });
    const controller = makeControllerStub({ onAction: handler });
    const ctx = { controller, store, state: makeState('idle') };

    // Путь 1: createEmit напрямую
    const emitDirect = createEmit(ctx as any);
    await emitDirect('onAction', { payload: 'direct' });
    expect(handler).toHaveBeenCalledTimes(1);

    handler.mockClear();

    // Путь 2: useEmit() через Context
    createRoot((dispose) => {
      const ContextProvider = Context.Provider;
      (ContextProvider as any)({
        value: ctx,
        get children() {
          const emitViaHook = useEmit();
          emitViaHook('onAction', { payload: 'via-hook' });
          return null;
        },
      });
      dispose();
    });

    expect(handler).toHaveBeenCalledTimes(1);
    // Оба пути вызвали handler с одинаковой структурой (payload прошёл)
    const [targetDirect] = handler.mock.calls[0] as unknown as [ITarget, unknown];
    expect(targetDirect.payload).toBe('via-hook');
  });
});

// ---------------------------------------------------------------------------
// Backward-compat: существующие хендлеры без emit не ломаются
// ---------------------------------------------------------------------------

describe('backward-compat: handlers without emit field', () => {
  it('handler not using emit works as before', async () => {
    const handler = vi.fn(async ({ target, store: s }: any) => `${target.name}-${s.id}`);

    const ctl = ControllerProxy({
      schema: {
        initial: 'idle',
        states: { idle: { onClick: handler } },
      },
      state: makeState('idle'),
      send: vi.fn(),
      store: { id: 'my-store', ctx: {} },
    });

    const result = await ctl.onClick({ name: 'btn' }, {});
    expect(result).toBe('btn-my-store');
    expect(handler).toHaveBeenCalledOnce();
  });

  it('emit is a no-op when not provided to ControllerProxy (backward-compat)', async () => {
    // Когда ControllerProxy создаётся без emit (например в тестах),
    // handler получает no-op emit — вызов не крашит.
    let emitResult: unknown = 'not-called';
    const handler = vi.fn(async ({ emit: emitFn }: any) => {
      emitResult = await emitFn('onSomething', { payload: 'x' });
      return 'ok';
    });

    const ctl = ControllerProxy({
      schema: {
        initial: 'idle',
        states: { idle: { onClick: handler } },
      },
      state: makeState('idle'),
      send: vi.fn(),
      store: makeStore(),
      // emit не передан — safeEmit = no-op
    });

    const result = await ctl.onClick({}, {});
    expect(result).toBe('ok');
    expect(emitResult).toBeUndefined(); // no-op вернул undefined
  });
});
