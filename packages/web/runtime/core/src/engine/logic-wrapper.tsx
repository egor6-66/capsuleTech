import { Utils } from '@capsuletech/shared-utils';
import { Zod } from '@capsuletech/shared-zod';
import { trace } from '@capsuletech/web-profiler/trace';
import { getApiClient } from '@capsuletech/web-query';
import { useRouter } from '@capsuletech/web-router';
import { createBridge, createState } from '@capsuletech/web-state';
import { CompositeProxyContext } from '@capsuletech/web-ui/compositeProxy';
import { useMachine } from '@xstate/solid';
import { createEffect, createUniqueId, onCleanup, Suspense } from 'solid-js';
import type {
  IDefineStateSchema,
  IHandlerApi,
  INext,
  IServices,
  IStateApi,
  IWrapperProps,
} from '../wrappers/interfaces';
import { ControllerProxy } from './controller-proxy';
import { Context, type IControllerHandle, useCtx } from './ctx';
import { type IRootForward, useEmbedMode, useHostInbound, useRootForward } from './host-bridge';
import { getPackageServices } from './package-services';
import { bindEvents } from './ui-proxy';
import { createEmit } from './use-emit';

type Kind = 'controller' | 'feature';

/**
 * Оборачивает controller КОРНЯ forward-gate'ом (ADR 060 D1): событие, дошедшее до корня
 * и заявленное в `contract.out`, форвардится хосту ВМЕСТО локального хендлера (return null).
 * Применяется ТОЛЬКО на корне (parent === undefined) в embedded+contract; вложенные слои и
 * standalone используют исходный controller. Незаявленные имена проходят к base-dispatch'у.
 */
const applyRootForward = (base: IControllerHandle, fwd: IRootForward): IControllerHandle =>
  new Proxy(base, {
    get(target, prop, receiver) {
      if (typeof prop === 'string' && fwd.shouldForward(prop)) {
        return (t?: { payload?: unknown }) => {
          fwd.forward(prop, t?.payload);
          return null;
        };
      }
      return Reflect.get(target, prop, receiver);
    },
  });

export const createLogicWrapper =
  // `IDefineStateSchema<any>` — нижняя граница, open-форма (принимает любой TCtx).
  // generic-инференс для TCtx/TEvents происходит на стороне IControllerWrapper/IFeatureWrapper при вызове.
  (kind: Kind) => (defineStateSchema: (services: IServices) => IDefineStateSchema<any>) =>
    function LogicWrapper(props: IWrapperProps) {
      // ADR 062 — постоянная trace-инструментация жизненного цикла логик-слоя
      // (per-mount; `id` парит mount↔dispose). Node по kind: `web-core.controller`
      // / `web-core.feature`. No-op когда trace-канал off.
      const __traceId = createUniqueId();
      trace(`web-core.${kind}`, 'mount', { id: __traceId });
      onCleanup(() => trace(`web-core.${kind}`, 'dispose', { id: __traceId }));

      const parent = useCtx();
      const router = useRouter();

      // Статичный run-режим запуска (источник — bootstrap iframe-check). Поля
      // фиксированы на сессию (не реактивные): апп гейтит автономные триггеры через
      // `if (standalone) …`. `standalone === !embedded` по построению.
      const { embedded } = useEmbedMode();

      // Feature получает `api` (typed proxy из createApi) дополнительно. Controller
      // — только `router`: compliance запрещает IO в Controller'е, а api именно про IO.
      // z и utils — capabilities, инжектируются в оба слоя (Controller и Feature).
      //
      // Пакетные services (web-auth, web-dnd, …) добавляются через спред
      // getPackageServices(): { [namespace]: services }. Базовые поля идут
      // ПОСЛЕДНИМИ, что гарантирует: пакетный namespace не может перезаписать
      // router / api / zod / utils (namespace'ы по контракту уникальны).
      const services: IServices =
        kind === 'feature'
          ? {
              ...getPackageServices(),
              router,
              api: getApiClient(),
              zod: Zod,
              utils: Utils,
              embedded,
              standalone: !embedded,
            }
          : {
              ...getPackageServices(),
              router,
              zod: Zod,
              utils: Utils,
              embedded,
              standalone: !embedded,
            };

      const schema = defineStateSchema(services);

      const machine = createState(schema);
      const [state, send] = useMachine(machine);

      const store = createBridge(state, send);

      // ctx строится в два шага: сначала объект без controller (нужен для замыкания emit),
      // потом controller строится через ControllerProxy (читает ctx лениво), потом
      // controller присваивается в ctx. Порядок гарантирует, что при первом вызове emit
      // (из хендлера после первого рендера) ctx.controller уже заполнен.
      const ctx = { controller: null as any, state, store, parent };

      // proxyEmit — ленивая обёртка: читает ctxEmit из замыкания в момент ВЫЗОВА,
      // не в момент создания. Это позволяет передать её в ControllerProxy до того
      // как ctxEmit создан, при этом избежав circular-dependency.
      // Хендлеры вызываются только после рендера, к тому моменту ctxEmit уже задан.
      let ctxEmit: ReturnType<typeof createEmit> | undefined;
      const proxyEmit: ReturnType<typeof createEmit> = (eventName, partial) =>
        ctxEmit!(eventName, partial);

      const baseController = ControllerProxy({
        schema,
        state,
        send,
        store,
        parent,
        overrides: props.overrides,
        // emit прокидывается в IHandlerApi каждого хендлера (event + lifecycle).
        // proxyEmit — ленивое замыкание, ctxEmit присваивается ниже до первого вызова.
        emit: proxyEmit,
      });

      // App→host forward-gate (ADR 060 D1): ТОЛЬКО на корне (parent === undefined) в
      // embedded+contract событие ∈ contract.out форвардится хосту вместо локального
      // хендлера. Вложенные слои / standalone / нет contract → исходный controller.
      const rootForward = useRootForward();
      const controller =
        !parent && rootForward ? applyRootForward(baseController, rootForward) : baseController;

      // controller готов — теперь создаём ctxEmit (ctx.controller уже присвоен).
      ctx.controller = controller;

      // Единственный экземпляр emit-функции для этого LogicWrapper'а.
      // Переиспользуется: proxyEmit → ctxEmit (события в handler-API),
      // lifecycleEmit (lifecycle-API), services.emit (factory-alias).
      ctxEmit = createEmit(ctx);

      // services.emit — ленивый alias для factory-тела. factory вызывается синхронно
      // до ctx.controller, поэтому emit в services работает только при ленивом вызове
      // (внутри хендлера, не на верхнем уровне factory). Это задокументировано в IServices.emit.
      services.emit = ctxEmit;

      // Host→app bridge (ADR 060 D1): ТОЛЬКО корневой логик-слой (parent === undefined)
      // подписывается на inbound host-события — вложенные иначе получали бы дубликат.
      // Валидированное host-событие инжектится как обычный HCA-dispatch через ctxEmit;
      // апп обрабатывает его штатно, БЕЗ embedding-кода. В standalone hostInbound = undefined.
      const hostInbound = useHostInbound();
      if (!parent && hostInbound) {
        const unregister = hostInbound.register((eventName, payload) =>
          ctxEmit!(eventName, { payload }),
        );
        onCleanup(unregister);
      }

      const stateApi: IStateApi = {
        get current() {
          return state.value as string;
        },
        set: (name: string) => send({ type: `__GOTO_${name}__` }),
        matches: (n: string | string[]) =>
          Array.isArray(n) ? n.includes(state.value as string) : state.value === n,
      };

      // Lifecycle hooks don't have a parent UI event, so `next()` is a no-op.
      // Cast keeps `next` shape (callable + `.with`) without polluting the
      // public INext type with optional surface.
      const lifecycleNext = Object.assign(async () => null, {
        with: async () => null,
      }) as unknown as INext;

      const lifecycleApi = (): IHandlerApi => ({
        target: {},
        context: store.ctx,
        store,
        state: stateApi,
        next: lifecycleNext,
        // proxyEmit — ленивая обёртка над ctxEmit; к моменту вызова lifecycle-хука
        // ctxEmit уже инициализирован (lifecycle createEffect запускается после рендера).
        emit: proxyEmit,
      });

      // Lifecycle: onInit / onExit, плюс initial-onInit на mount
      let prevState: string | undefined;
      createEffect(() => {
        const current = state.value as string;
        if (prevState === undefined) {
          schema.states[current]?.onInit?.(lifecycleApi());
        } else if (prevState !== current) {
          schema.states[prevState]?.onExit?.(lifecycleApi());
          schema.states[current]?.onInit?.(lifecycleApi());
        }
        prevState = current;
      });

      // Top-level `onRegister` фаерит РЕАКТИВНО при каждой регистрации компонента
      // в `store.components`. Так оно корректно работает с lazy-детьми (lazy()
      // из registry, TanStack lazy-routes, Suspense), которые регистрируются
      // позже первого тика рендера.
      //
      // От пользователя требуется идемпотентность — типичный кейс
      // (пересинхронизировать active-state с router'ом) ему естественно соответствует.
      // XState `assign({components: ...})` создаёт новый ref на каждый REGISTER_COMPONENT,
      // поэтому подписка через чтение `store.components` срабатывает на каждую регистрацию.
      createEffect(() => {
        void store.components;
        schema.onRegister?.(lifecycleApi());
      });

      onCleanup(() => {
        // schema.onDispose — единственный teardown-хук. Async-возврат не ждём
        // (Solid onCleanup синхронный); сами ошибки логируем, чтобы случайный
        // throw не валил unmount Solid-дерева.
        try {
          const r = schema.onDispose?.(lifecycleApi());
          if (r && typeof (r as Promise<unknown>).catch === 'function') {
            (r as Promise<unknown>).catch((err) =>
              console.error('[LogicWrapper] onDispose async failed:', err),
            );
          }
        } catch (err) {
          console.error('[LogicWrapper] onDispose sync threw:', err);
        }
      });

      return (
        <Suspense fallback={props.fallback}>
          <Context.Provider value={ctx}>
            <CompositeProxyContext.Provider
              value={{ wrap: (Comp, name) => bindEvents(ctx, Comp, name) }}
            >
              {props.children}
            </CompositeProxyContext.Provider>
          </Context.Provider>
        </Suspense>
      );
    };
