/**
 * useEmit + EmitContext (sink routing) — тесты embedded-mode.
 *
 * Контракт (бриф phase1a-fix-web-core-useEmit-emitsink, acceptance #2):
 *  1. С sink: useEmit диспатчит локально (ControllerProxy) И вызывает sink.send(eventName, payload).
 *  2. Без EmitProvider (standalone): sink не вызывается, поведение идентично текущему.
 *  3. EmitProvider с eventSink=undefined (transparent wrapper): sink не вызывается.
 *  4. Возврат useEmit — всегда от локального dispatch (не от sink).
 *  5. Порядок вызовов: локальный dispatch первым, sink после.
 */

import { createRoot } from 'solid-js';
import { describe, expect, it, vi } from 'vitest';
import type { ITarget } from '../../wrappers/interfaces';
import { Context } from '../ctx';
import { EmitContext } from '../emit-context';
import { useEmit } from '../use-emit';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const makeStore = (ctxData: any = {}) => ({
  ctx: ctxData,
  registerComponent: vi.fn(),
  unregisterComponent: vi.fn(),
  styles: {} as Record<string, string>,
  loading: false,
  props: {} as Record<string, any>,
});

const makeController = (handlers: Record<string, ReturnType<typeof vi.fn>> = {}) =>
  new Proxy({} as any, {
    get(_target, prop: string) {
      if (handlers[prop]) return handlers[prop];
      return vi.fn(async () => null);
    },
  });

/**
 * Запускает fn внутри ControllerContext + (опционально) EmitContext.Provider.
 * Оба контекста пушатся через функциональный API Solid (без DOM).
 */
const runInCtxWithSink = <T>(
  ctxValue: any,
  sinkValue: { send: (e: string, p?: unknown) => void } | undefined,
  fn: () => T,
): T =>
  createRoot((dispose) => {
    let result: T;

    const ContextProvider = Context.Provider;
    const EmitContextProvider = EmitContext.Provider;

    if (sinkValue !== undefined) {
      // Два вложенных провайдера: Controller > EmitContext
      (ContextProvider as any)({
        value: ctxValue,
        get children() {
          (EmitContextProvider as any)({
            value: sinkValue,
            get children() {
              result = fn();
              return result;
            },
          });
          return null;
        },
      });
    } else {
      // Только ControllerContext (standalone: без EmitContext)
      (ContextProvider as any)({
        value: ctxValue,
        get children() {
          result = fn();
          return result;
        },
      });
    }

    dispose();
    return result!;
  });

// ---------------------------------------------------------------------------
// Тесты: standalone (без sink)
// ---------------------------------------------------------------------------

describe('useEmit — standalone (no EmitProvider)', () => {
  it('без EmitContext sink не вызывается — поведение как было', async () => {
    const onClickMock = vi.fn(async () => 'local-result');
    const controller = makeController({ onClick: onClickMock });
    const store = makeStore({ userId: 1 });
    const ctx = { controller, store, state: { value: 'idle' } };

    const result = runInCtxWithSink(ctx, undefined, () => {
      const emit = useEmit();
      return emit('onClick', { meta: { tags: ['submit'] } });
    });

    // Локальный dispatch сработал
    expect(onClickMock).toHaveBeenCalledOnce();
    await expect(result).resolves.toBe('local-result');
  });
});

// ---------------------------------------------------------------------------
// Тесты: transparent wrapper (EmitProvider без eventSink → undefined в context)
// ---------------------------------------------------------------------------

describe('useEmit — transparent EmitProvider (eventSink=undefined)', () => {
  it('sink = undefined в context → sink.send не вызывается, локальный dispatch работает', async () => {
    const onSubmitMock = vi.fn(async () => 'submit-ok');
    const controller = makeController({ onSubmit: onSubmitMock });
    const ctx = { controller, store: makeStore(), state: { value: 'idle' } };

    // Передаём undefined как sinkValue — EmitContext.Provider получит undefined
    const result = runInCtxWithSink(ctx, undefined, () => {
      const emit = useEmit();
      return emit('onSubmit', { payload: { form: 'login' } });
    });

    expect(onSubmitMock).toHaveBeenCalledOnce();
    await expect(result).resolves.toBe('submit-ok');
  });
});

// ---------------------------------------------------------------------------
// Тесты: embedded mode (с sink)
// ---------------------------------------------------------------------------

describe('useEmit — embedded (EmitProvider с eventSink)', () => {
  it('emit вызывает sink.send(eventName, payload) И локальный dispatch', async () => {
    const mockSend = vi.fn();
    const sink = { send: mockSend };

    const onLoginMock = vi.fn(async () => 'login-result');
    const controller = makeController({ onLogin: onLoginMock });
    const ctx = { controller, store: makeStore({ userId: null }), state: { value: 'idle' } };

    const result = runInCtxWithSink(ctx, sink, () => {
      const emit = useEmit();
      return emit('onLogin', { payload: { token: 'abc' } });
    });

    // Локальный dispatch
    expect(onLoginMock).toHaveBeenCalledOnce();
    const [target] = onLoginMock.mock.calls[0] as unknown as [ITarget, unknown];
    expect(target.payload).toEqual({ token: 'abc' });

    // Sink forward
    expect(mockSend).toHaveBeenCalledOnce();
    expect(mockSend).toHaveBeenCalledWith('onLogin', { token: 'abc' });

    // Возврат — от локального dispatch
    await expect(result).resolves.toBe('login-result');
  });

  it('emit без payload → sink.send(eventName, undefined)', async () => {
    const mockSend = vi.fn();
    const sink = { send: mockSend };

    const onMountMock = vi.fn(async () => null);
    const controller = makeController({ onMount: onMountMock });
    const ctx = { controller, store: makeStore(), state: { value: 'idle' } };

    runInCtxWithSink(ctx, sink, () => {
      const emit = useEmit();
      return emit('onMount');
    });

    expect(onMountMock).toHaveBeenCalledOnce();
    expect(mockSend).toHaveBeenCalledOnce();
    expect(mockSend).toHaveBeenCalledWith('onMount', undefined);
  });

  it('emit с meta.tags — sink получает payload (не meta)', async () => {
    const mockSend = vi.fn();
    const sink = { send: mockSend };

    const onSelectMock = vi.fn(async () => 'selected');
    const controller = makeController({ onSelect: onSelectMock });
    const ctx = { controller, store: makeStore(), state: { value: 'idle' } };

    runInCtxWithSink(ctx, sink, () => {
      const emit = useEmit();
      // partial.payload — это то что идёт в sink; meta используется для normalizeTarget
      return emit('onSelect', { meta: { tags: ['item'] }, payload: { id: 7 } });
    });

    // sink получает только payload, не meta
    expect(mockSend).toHaveBeenCalledWith('onSelect', { id: 7 });
  });

  it('порядок: localEmit вызывается до sink.send по позиции в коде', async () => {
    const callOrder: string[] = [];
    // sink — синхронный
    const mockSend = vi.fn(() => {
      callOrder.push('sink');
    });
    const sink = { send: mockSend };

    // Локальный mock: async-функция без внутреннего await →
    // тело выполняется синхронно (до первого await), затем возвращает resolved Promise.
    const onDropMock = vi.fn(async () => {
      callOrder.push('local');
      return 'dropped';
    });
    const controller = makeController({ onDrop: onDropMock });
    const ctx = { controller, store: makeStore(), state: { value: 'idle' } };

    const result = runInCtxWithSink(ctx, sink, () => {
      const emit = useEmit();
      return emit('onDrop', { payload: 'x' });
    });

    // Оба вызова уже произошли синхронно (async body без await = синхронно до return).
    // Порядок: localEmit() вызывается первым по коду → 'local' pushится первым,
    // затем sink?.send() → 'sink' pushится вторым.
    expect(onDropMock).toHaveBeenCalledOnce();
    expect(mockSend).toHaveBeenCalledOnce();
    expect(callOrder).toEqual(['local', 'sink']);
    await expect(result).resolves.toBe('dropped');
  });

  it('несколько emit-вызовов — каждый идёт в sink', async () => {
    const mockSend = vi.fn();
    const sink = { send: mockSend };

    const controller = makeController({});
    const ctx = { controller, store: makeStore(), state: { value: 'idle' } };

    runInCtxWithSink(ctx, sink, () => {
      const emit = useEmit();
      emit('onEvent1', { payload: 'a' });
      emit('onEvent2', { payload: 'b' });
      emit('onEvent3');
    });

    expect(mockSend).toHaveBeenCalledTimes(3);
    expect(mockSend.mock.calls[0]).toEqual(['onEvent1', 'a']);
    expect(mockSend.mock.calls[1]).toEqual(['onEvent2', 'b']);
    expect(mockSend.mock.calls[2]).toEqual(['onEvent3', undefined]);
  });

  it('возврат — от локального dispatch, не от sink', async () => {
    const mockSend = vi.fn(() => 'sink-value'); // sink возвращает что-то
    const sink = { send: mockSend };

    const onChangeMock = vi.fn(async () => 'local-value');
    const controller = makeController({ onChange: onChangeMock });
    const ctx = { controller, store: makeStore(), state: { value: 'idle' } };

    const result = runInCtxWithSink(ctx, sink, () => {
      const emit = useEmit();
      return emit('onChange', { value: 'hello' });
    });

    // Возврат — от localEmit (ControllerProxy dispatch)
    await expect(result).resolves.toBe('local-value');
  });
});
