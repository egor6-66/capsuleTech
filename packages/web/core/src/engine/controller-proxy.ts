import type { IDefineStateSchema, INext, IStateApi, ITarget } from '../wrappers/interfaces';
import type { ICtx } from './ctx';

interface IControllerProxyParams {
  schema: IDefineStateSchema;
  /** реактивный snapshot из useMachine */
  state: any;
  send: (event: any) => void;
  store: any;
  parent?: ICtx<any>;
  overrides?: Record<string, string>;
}

const buildStateApi = (state: any, send: any): IStateApi => ({
  get current() {
    return state.value as string;
  },
  set: (name: string) => send({ type: `__GOTO_${name}__` }),
  matches: (n: string | string[]) =>
    Array.isArray(n) ? n.includes(state.value as string) : state.value === n,
});

export const ControllerProxy = ({
  schema,
  state,
  send,
  store,
  parent,
  overrides,
}: IControllerProxyParams): any => {
  return new Proxy({} as any, {
    get(_, methodName: string) {
      // системные поля
      if (methodName === 'store') return store;

      return async (target: ITarget, context: any) => {
        const current = state.value as string;
        const stateHandlers = schema.states?.[current];
        const method = stateHandlers?.[methodName] ?? (schema as any)[methodName];

        const stateApi = buildStateApi(state, send);

        // Bubble-helper: один путь для `next()` и `next.with(arg)`. Разница —
        // только в значении `from` у enriched-target'а.
        //   `?? null`: optional-chain в parent даёт undefined при missing method,
        //   но тип возврата `Promise<T | null>` обещает null — выравниваем.
        //   Тест в `__tests__/controller-proxy.test.ts` (`next() returns null if parent has no matching method`).
        const callParent = async <T = any>(enrichedTarget: ITarget): Promise<T | null> => {
          if (!parent?.controller) return null;
          const targetMethod = overrides?.[methodName] ?? methodName;
          return (await parent.controller[targetMethod]?.(enrichedTarget, context)) ?? null;
        };

        // `next()` — пассивный bubble: payload остаётся JSX-immutable, `from`
        // сбрасывается в undefined (никакого явного сигнала от этого уровня).
        const next = (async <T = any>(): Promise<T | null> =>
          callParent<T>({ ...target, from: undefined })) as INext;
        // `next.with(arg)` — bubble с явной передачей данных в `target.from`.
        next.with = async <T = any>(arg: unknown): Promise<T | null> =>
          callParent<T>({ ...target, from: arg });

        // если метод не найден — автобабблинг к родителю
        if (typeof method !== 'function') return await next();

        try {
          return await method({ target, context, next, store, state: stateApi });
        } catch (err) {
          console.error(`[Controller] метод "${methodName}" в стейте "${current}" упал:`, err);
          // Централизованный hook: вызываем `schema.onError`, если он определён.
          // Свой try/catch + safeCall-логика — onError не должна разрушать
          // pipe или прятать оригинальную ошибку (она всегда re-throw'ается ниже).
          const onError = (schema as { onError?: (api: any) => any }).onError;
          if (typeof onError === 'function') {
            try {
              const r = onError({
                target,
                context,
                next,
                store,
                state: stateApi,
                error: err,
                method: methodName,
              });
              if (r && typeof (r as Promise<unknown>).catch === 'function') {
                (r as Promise<unknown>).catch((handlerErr) =>
                  console.error('[Controller] onError async threw:', handlerErr),
                );
              }
            } catch (handlerErr) {
              console.error('[Controller] onError sync threw:', handlerErr);
            }
          }
          throw err;
        }
      };
    },
  });
};
