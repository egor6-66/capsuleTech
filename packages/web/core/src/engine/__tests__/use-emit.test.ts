/**
 * useEmit — тесты (ADR 032, фаза 1).
 *
 * Контракт:
 *  1. emit(name, partial) нормализует partial → полный ITarget и зовёт
 *     ctx.controller[name](target, ctx.store.ctx) — тот же dispatch-путь что UiProxy.
 *  2. Резолюция handler'а идёт через ControllerProxy: states[cur][name] → top-level → next().
 *     useEmit не дублирует ControllerProxy-логику — она уже покрыта в controller-proxy.test.ts.
 *     Здесь тестируем: (a) правильность вызова через ctx.controller[name], (b) нормализацию target,
 *     (c) пробрасывание возврата (в т.ч. async), (d) ошибку вне scope.
 *  3. Вне Controller-scope (нет Context) — бросает понятную ошибку.
 *
 * Тесты НЕ монтируют Solid-компонент — напрямую вызываем через createRoot Solid'а
 * (реактивный scope нужен для useContext). Не подключаем Solid-рендер (нет jsdom в этих тестах).
 */

import { createRoot } from 'solid-js';
import { describe, expect, it, vi } from 'vitest';
import type { ITarget } from '../../wrappers/interfaces';
import { Context } from '../ctx';
import { normalizeTarget, useEmit } from '../use-emit';

// ---------------------------------------------------------------------------
// Вспомогательные factory-функции
// ---------------------------------------------------------------------------

const makeStore = (ctxData: any = { foo: 'bar' }) => ({
  ctx: ctxData,
  registerComponent: vi.fn(),
  unregisterComponent: vi.fn(),
  styles: {} as Record<string, string>,
  loading: false,
  props: {} as Record<string, any>,
});

const makeController = (handlers: Record<string, ReturnType<typeof vi.fn>> = {}) =>
  new Proxy(
    {} as any,
    {
      get(_target, prop: string) {
        if (handlers[prop]) return handlers[prop];
        // fallback: возвращаем vi.fn() для любого неопределённого метода
        return vi.fn(async () => null);
      },
    },
  );

/** Запускает callback внутри реактивного Solid-scope, обёрнутого Context.Provider. */
const runInCtx = <T>(ctxValue: any, fn: () => T): T =>
  createRoot((dispose) => {
    let result: T;
    // Solid Context.Provider доступен через JSX, но для unit-тестов без DOM
    // используем createRoot + runWithOwner обёртку через Context.Provider functional API.
    // В Solid-js Context.Provider — это компонент, и мы не можем вызвать useContext
    // без рендера. Обходим через `Context` (createContext) напрямую:
    // `Context._context.defaultValue` не подходит — используем стандартный способ:
    // запускаем через `Context.Provider` render-функцию внутри createRoot.
    const ContextProvider = Context.Provider;
    // Solid-провайдеры можно «вызвать» как функцию только через компонент, поэтому
    // используем solid's `runWithOwner` + `getContext`-подход. На самом деле самый
    // простой способ в тестах — создать scope с инжектом через Solid's contextStack.
    // Поскольку мы не в jsdom-env и не рендерим DOM, используем функциональный
    // helper через `untrack` + ручной стек: Context.Provider вызывается как фабрика.
    // Solid Context API: createContext().Provider — это Component<{ value, children }>.
    // children — это () => JSX; в non-DOM тестах достаточно вернуть результат.
    // Обходной путь: выполняем fn внутри solid-js createMemo/solid owner с провайдером.
    //
    // ФИНАЛЬНЫЙ подход: вызываем Context.Provider как функцию напрямую с children-геттером.
    // Это работает потому что Solid-рантайм пушит контекст через owner-stack,
    // не через React-подобный DOM.
    (ContextProvider as any)({ value: ctxValue, get children() { return (result = fn()); } });
    dispose();
    return result!;
  });

// ---------------------------------------------------------------------------
// normalizeTarget
// ---------------------------------------------------------------------------

describe('normalizeTarget', () => {
  it('empty partial → all fields are undefined/default', () => {
    const t = normalizeTarget({});
    expect(t.name).toBeUndefined();
    expect(t.value).toBeUndefined();
    expect(t.meta).toBeUndefined();
    expect(t.payload).toBeUndefined();
    expect(t.key).toBeUndefined();
    expect(t.modifiers).toBeUndefined();
    expect(t.from).toBeUndefined();
  });

  it('meta.tags → name derived from first non-@ tag', () => {
    const t = normalizeTarget({ meta: { tags: ['email', 'input'] } });
    expect(t.name).toBe('email');
    expect(t.meta?.tags).toEqual(['email', 'input']);
  });

  it('@-prefixed-only tags → name undefined', () => {
    const t = normalizeTarget({ meta: { tags: ['@submit', '@input'] } });
    expect(t.name).toBeUndefined();
  });

  it('explicit name overridden by deriveName when meta.tags present', () => {
    // deriveName wins (derived from tags) — это зеркало UiProxy-поведения
    const t = normalizeTarget({ name: 'explicit', meta: { tags: ['login'] } });
    expect(t.name).toBe('login');
  });

  it('name from partial.name when no meta.tags', () => {
    const t = normalizeTarget({ name: 'my-name', value: 'v' });
    // deriveName(undefined) → undefined, getTargetData falls back to finalProps.name
    expect(t.name).toBe('my-name');
    expect(t.value).toBe('v');
  });

  it('payload, dynamicMeta, value — pass-through', () => {
    const payload = { href: '/home' };
    const dynamicMeta = { tags: ['nav'] };
    const t = normalizeTarget({ payload, dynamicMeta, value: 42 });
    expect(t.payload).toBe(payload);
    expect(t.dynamicMeta).toBe(dynamicMeta);
    expect(t.value).toBe(42);
  });

  it('key and modifiers — included when provided', () => {
    const modifiers = { ctrl: true, shift: false, alt: false, meta: false };
    const t = normalizeTarget({ key: 'Enter', modifiers });
    expect(t.key).toBe('Enter');
    expect(t.modifiers).toBe(modifiers);
  });

  it('from — included when provided', () => {
    const t = normalizeTarget({ from: { childData: 123 } });
    expect(t.from).toEqual({ childData: 123 });
  });

  it('no modifiers field when not in partial (no DOM event)', () => {
    // getTargetData с event=undefined не выставляет modifiers: undefined из event-ветки,
    // а normalizeTarget не добавляет их если не в partial
    const t = normalizeTarget({ meta: { tags: ['btn'] } });
    expect(t.modifiers).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// useEmit — вне Controller-scope
// ---------------------------------------------------------------------------

describe('useEmit — outside Controller scope', () => {
  it('throws with clear message when no ControllerContext', () => {
    expect(() =>
      createRoot((dispose) => {
        try {
          useEmit();
        } finally {
          dispose();
        }
      }),
    ).toThrow('useEmit must be used inside a Controller or Feature scope');
  });
});

// ---------------------------------------------------------------------------
// useEmit — dispatch
// ---------------------------------------------------------------------------

describe('useEmit — dispatch через ctx.controller[name]', () => {
  it('emit("onClick", target) → вызывает ctx.controller.onClick с нормализованным target', () => {
    const onClickMock = vi.fn(async () => 'click-result');
    const controller = makeController({ onClick: onClickMock });
    const store = makeStore({ userId: 1 });
    const ctx = { controller, store, state: { value: 'idle' } };

    const result = runInCtx(ctx, () => {
      const emit = useEmit();
      return emit('onClick', { meta: { tags: ['submit'] }, payload: { id: 42 } });
    });

    expect(onClickMock).toHaveBeenCalledOnce();
    const [target, context] = (onClickMock.mock.calls[0] as unknown) as [ITarget, unknown];
    expect(target.name).toBe('submit');
    expect(target.meta?.tags).toContain('submit');
    expect(target.payload).toEqual({ id: 42 });
    // context = ctx.store.ctx
    expect(context).toEqual({ userId: 1 });
    // возврат пробрасывается
    return expect(result).resolves.toBe('click-result');
  });

  it('emit("onDrop", partial) → вызывает ctx.controller.onDrop (custom event name)', async () => {
    const onDropMock = vi.fn(async () => 'drop-result');
    const controller = makeController({ onDrop: onDropMock });
    const store = makeStore();
    const ctx = { controller, store, state: { value: 'idle' } };

    const result = runInCtx(ctx, () => {
      const emit = useEmit();
      return emit('onDrop', { payload: { x: 10, y: 20 } });
    });

    expect(onDropMock).toHaveBeenCalledOnce();
    const [target] = (onDropMock.mock.calls[0] as unknown) as [ITarget, unknown];
    expect(target.payload).toEqual({ x: 10, y: 20 });
    await expect(result).resolves.toBe('drop-result');
  });

  it('emit без partial → нормализованный target с пустыми полями', () => {
    const onSelectMock = vi.fn(async () => undefined);
    const controller = makeController({ onSelect: onSelectMock });
    const ctx = { controller, store: makeStore(), state: { value: 'idle' } };

    runInCtx(ctx, () => {
      const emit = useEmit();
      emit('onSelect');
    });

    expect(onSelectMock).toHaveBeenCalledOnce();
    const [target] = (onSelectMock.mock.calls[0] as unknown) as [ITarget, unknown];
    expect(target.name).toBeUndefined();
    expect(target.payload).toBeUndefined();
  });

  it('async handler — Promise пробрасывается без проглатывания', async () => {
    const asyncMock = vi.fn(async () => {
      await Promise.resolve();
      return 'async-value';
    });
    const controller = makeController({ onLoad: asyncMock });
    const ctx = { controller, store: makeStore(), state: { value: 'idle' } };

    const result = runInCtx(ctx, () => {
      const emit = useEmit();
      return emit('onLoad', { payload: 'data' });
    });

    await expect(result).resolves.toBe('async-value');
  });

  it('ControllerProxy FSM dispatch: state-level handler → вызывается по текущему state', async () => {
    // Тестируем, что useEmit действительно идёт через ControllerProxy FSM-логику
    // (не short-circuits мимо неё). Используем настоящий ControllerProxy.
    const { ControllerProxy } = await import('../controller-proxy');
    const idleHandler = vi.fn(async () => 'idle-result');
    const busyHandler = vi.fn(async () => 'busy-result');
    const send = vi.fn();
    const store = makeStore();

    const controller = ControllerProxy({
      schema: {
        initial: 'idle',
        states: {
          idle: { onDrop: idleHandler },
          busy: { onDrop: busyHandler },
        },
      },
      state: { value: 'idle' },
      send,
      store,
    });

    const ctx = { controller, store, state: { value: 'idle' } };

    const result = runInCtx(ctx, () => {
      const emit = useEmit();
      return emit('onDrop', { meta: { tags: ['canvas'] }, payload: { nodeId: 'x' } });
    });

    await expect(result).resolves.toBe('idle-result');
    expect(idleHandler).toHaveBeenCalledOnce();
    expect(busyHandler).not.toHaveBeenCalled();

    const [api] = (idleHandler.mock.calls[0] as unknown) as [{ target: ITarget; context: any }];
    expect(api.target.name).toBe('canvas');
    expect(api.target.payload).toEqual({ nodeId: 'x' });
  });

  it('ControllerProxy FSM dispatch: fallback на top-level handler', async () => {
    const { ControllerProxy } = await import('../controller-proxy');
    const topLevelHandler = vi.fn(async () => 'top-result');

    const controller = ControllerProxy({
      schema: {
        initial: 'idle',
        states: { idle: {} },
        onDrop: topLevelHandler,
      },
      state: { value: 'idle' },
      send: vi.fn(),
      store: makeStore(),
    });

    const ctx = { controller, store: makeStore(), state: { value: 'idle' } };

    const result = runInCtx(ctx, () => {
      const emit = useEmit();
      return emit('onDrop', { payload: 'fallback-test' });
    });

    await expect(result).resolves.toBe('top-result');
    expect(topLevelHandler).toHaveBeenCalledOnce();
  });

  it('ControllerProxy FSM dispatch: next()-bubbling к parent', async () => {
    const { ControllerProxy } = await import('../controller-proxy');
    const parentHandler = vi.fn(async () => 'parent-result');

    const parent = {
      controller: makeController({ onDrop: parentHandler }),
      store: makeStore(),
      state: { value: 'idle' },
    };

    const controller = ControllerProxy({
      schema: {
        initial: 'idle',
        states: { idle: {} }, // нет onDrop → автобаблинг
      },
      state: { value: 'idle' },
      send: vi.fn(),
      store: makeStore(),
      parent: parent as any,
    });

    const ctx = { controller, store: makeStore(), state: { value: 'idle' } };

    const result = runInCtx(ctx, () => {
      const emit = useEmit();
      return emit('onDrop');
    });

    await expect(result).resolves.toBe('parent-result');
    expect(parentHandler).toHaveBeenCalledOnce();
  });
});
