---
tags: [hca, adr, accepted]
status: canon
date: 2026-05-09
---

# ADR 008 — Гибридная FSM-схема: XState локально, `next()` отдельно

> Под-решение [[001-xstate-as-canonical-fsm|ADR 001]]. Фиксирует **API-стиль** и **точку стыковки** XState ↔ HCA.

## Контекст {#context}

[[001-xstate-as-canonical-fsm|ADR 001]] зафиксировал: XState — единственный движок локальной FSM. Открытый вопрос: как пользовательский `IDefineStateSchema` отображается на XState и как реализуется `next()`.

После анализа [[ui-proxy]] и [[controller-proxy]] стало ясно: текущий императивный API схемы (`states.idle.onClick(api) => ...`) близок к замыслу, и UiProxy уже спроектирован вокруг прямого вызова `ctx.controller.onClick(...)`, а не event-bus.

## Решение {#decisions}

**Гибрид (стиль 2 из [[001-xstate-as-canonical-fsm|ADR 001]]).** Два независимых канала:

| Канал | Кто отвечает | Через что |
|---|---|---|
| **Стейт-машина** (transitions, entry/exit, context, guards, invoke) | XState | `actor.send({ type: '__GOTO_X__' })`, `actor.getSnapshot()` |
| **Диспетч UI-событий** (onClick / onInput / onBlur / ...) | HCA Proxy | прямой вызов `controller.<method>(target, context)` |
| **`next()`** (межконтроллерная цепочка) | HCA Proxy | прямой вызов `parent.controller[name](...)`, **вне** XState |

XState владеет ответом на «в каком стейте я сейчас». Proxy спрашивает у XState текущий стейт через `actor.getSnapshot().value` и сам резолвит метод по схеме.

## Целевой `IHandlerApi`

```ts
interface ITarget<TMeta = TagMeta> {
  name?: string;
  value?: unknown;
  type?: string;
  meta?: TMeta;          // авторская роль (зашита в Entity)
  dynamicMeta?: TMeta;   // сценарная окраска (накинута Widget'ом)
  payload?: unknown;     // прокидывается через next()
  key?: string;          // для keyboard-событий — см. ADR 009
}

type TagMeta = { tags: string[]; [k: string]: unknown };

interface IStore<TCtx = any> {
  // снимки
  ctx: TCtx;
  loading: boolean;
  errors: Record<string, string>;
  styles: Record<string, string>;
  components: Record<string, ITarget>;

  // мутации
  update(payload: Partial<TCtx>): void;
  setLoading(value: boolean): void;
  setStyles(styles: Record<string, string>): void;
  setErrors(errors: Record<string, string>): void;
  registerComponent(payload: Record<string, ITarget>): void;   // см. ADR 007
  unregisterComponent(id: string): void;                       // см. ADR 007

  // tag-операции (объединяют meta.tags + dynamicMeta.tags)
  pick(tags: string[], opts?: { lookDynamic?: boolean }): Record<string, ITarget>;
  omit(tags: string[], opts?: { lookDynamic?: boolean }): Record<string, ITarget>;
  match(tags: string[], opts?: { lookDynamic?: boolean }): ITarget | undefined;
  matchEntry(tags: string[], opts?: { lookDynamic?: boolean }): (ITarget & { id: string }) | undefined;
}

interface IStateApi<TStates extends string = string> {
  current: TStates;
  set(name: TStates): void;
  matches(name: TStates | TStates[]): boolean;
}

interface IHandlerApi<TCtx = any, TStates extends string = string> {
  target: ITarget;
  context: TCtx;            // = store.ctx, дублируем для удобства
  next<T = unknown>(payload?: unknown): Promise<T | null>;
  state: IStateApi<TStates>;
  store: IStore<TCtx>;
}
```

## `IDefineStateSchema` (без изменений в форме, расширение в наборе методов)

```ts
interface IStateHandlers {
  onInit?:  (api: IHandlerApi) => void | Promise<void>;
  onExit?:  (api: IHandlerApi) => void | Promise<void>;
  // UI-события — точный набор задаётся в ADR 009
  onClick?: (api: IHandlerApi) => void | Promise<unknown>;
  onInput?: (api: IHandlerApi) => void | Promise<unknown>;
  onChange?: (api: IHandlerApi) => void | Promise<unknown>;
  onBlur?:   (api: IHandlerApi) => void | Promise<unknown>;
  onFocus?:  (api: IHandlerApi) => void | Promise<unknown>;
  onKeyDown?:(api: IHandlerApi) => void | Promise<unknown>;
  onSubmit?: (api: IHandlerApi) => void | Promise<unknown>;
  // пользовательские (для приёма от next())
  [methodName: string]: ((api: IHandlerApi) => any) | undefined;
}

interface IDefineStateSchema<TCtx = any, TStates extends string = string> {
  initial: TStates;
  context?: TCtx;
  states: Record<TStates, IStateHandlers>;
  // top-level fallback handlers (вызываются, если в текущем стейте нет)
  onClick?: (api: IHandlerApi) => any;
  // ...все события доступны и тут
}
```

## Псевдо-код компилятора `IDefineStateSchema → XState config`

```ts
function compile<S extends IDefineStateSchema>(schema: S, services: any) {
  const stateNames = Object.keys(schema.states) as Array<keyof S['states']>;

  return setup({
    types: { context: {} as ContextShape },
    actions: {
      // entry/exit генерим динамически по именам стейтов
      ...Object.fromEntries(stateNames.flatMap((s) => [
        [`__init_${s}`, ({ context, event }) => invokeUserHandler(schema.states[s].onInit, ctx)],
        [`__exit_${s}`, ({ context, event }) => invokeUserHandler(schema.states[s].onExit, ctx)],
      ])),
      // store-мутации
      __set_data:    assign({ data:    ({ context, event }) => ({ ...context.data, ...event.payload }) }),
      __set_loading: assign({ loading: ({ event }) => event.value }),
      __set_styles:  assign({ styles:  ({ event }) => event.styles }),
      __set_errors:  assign({ errors:  ({ event }) => event.errors }),
      __register:    assign({ components: ({ context, event }) => ({ ...context.components, ...event.payload }) }),
      __unregister:  assign({ components: ({ context, event }) => {
        const { [event.id]: _, ...rest } = context.components;
        return rest;
      }}),
    },
  }).createMachine({
    initial: schema.initial,
    context: { data: schema.context ?? {}, loading: false, errors: {}, styles: {}, components: {} },
    states: Object.fromEntries(stateNames.map((s) => [s, {
      entry: schema.states[s].onInit ? [`__init_${s}`] : [],
      exit:  schema.states[s].onExit ? [`__exit_${s}`] : [],
    }])),
    on: {
      // переходы между стейтами через единый __GOTO__
      ...Object.fromEntries(stateNames.map((s) => [`__GOTO_${String(s)}__`, `.${String(s)}`])),
      // store-мутации
      SET_DATA: { actions: '__set_data' },
      SET_LOADING: { actions: '__set_loading' },
      SET_STYLES: { actions: '__set_styles' },
      SET_ERRORS: { actions: '__set_errors' },
      REGISTER_COMPONENT: { actions: '__register' },
      UNREGISTER_COMPONENT: { actions: '__unregister' },
    },
  });
}
```

## Псевдо-код Proxy (диспетч UI-события)

```ts
function ControllerProxy({ schema, actor, store, parent, overrides }) {
  return new Proxy({} as any, {
    get(_, methodName: string) {
      if (methodName === 'store') return store;
      if (methodName === 'destroy') return () => actor.stop();

      return async (target, context) => {
        const current = actor.getSnapshot().value as string;
        const stateHandlers = schema.states?.[current];
        const method = stateHandlers?.[methodName] ?? (schema as any)[methodName];

        const stateApi = {
          get current() { return actor.getSnapshot().value; },
          set: (name: string) => actor.send({ type: `__GOTO_${name}__` }),
          matches: (n) => Array.isArray(n) ? n.includes(actor.getSnapshot().value) : actor.getSnapshot().value === n,
        };

        const next = async (payload = null) => {
          if (!parent?.controller) return null;
          const enrichedTarget = { ...target, payload: payload ?? target.payload };
          const targetMethod = overrides?.[methodName] ?? methodName;
          return await parent.controller[targetMethod]?.(enrichedTarget, context);
        };

        if (typeof method !== 'function') return await next();

        try {
          return await method({ target, context, next, store, state: stateApi });
        } catch (err) {
          console.error(`[Controller] ${methodName} в стейте ${current} упал:`, err);
          throw err;
        }
      };
    },
  });
}
```

## Сопутствующие фиксы (бандлятся в этот рефакторинг)

1. **`internalMeta` → `dynamicMeta`** в `helpers.ts` (`pickByTags/omitByTags/matchByTags`). Сейчас helpers ищут несуществующее поле, поэтому сценарные теги Widget'а не находятся.
2. **Initial-state `onInit`.** Сейчас не вызывается при mount. После рефакторинга — отрабатывает автоматически через XState `entry` для initial state.
3. **`getTargetData` JSON.parse.** Чинится попутно: `typeof meta === 'string' ? JSON.parse(meta) : finalProps.meta`.
4. **UiProxy не `await`-ит и не `.catch`-ит.** Оборачиваем: `Promise.resolve(...).catch(reportError)`.

## Альтернативы {#alternatives}

- **Полная декларация (стиль 1/3).** Каноничнее XState, но переписывание всего sandbox-кода. Отвергнуто — текущий стиль уже близок к рабочему.
- **`next()` через `sendParent`.** Async-return требует id-correlation или invoke-через-promise. Гимор. Отвергнуто — см. [[001-xstate-as-canonical-fsm|ADR 001]].

## Последствия {#consequences}

### Положительные
- API схемы остаётся узнаваемым для текущего sandbox-кода.
- XState DevTools видят все transitions (через `__GOTO__`) и entry/exit-эффекты.
- `next()` сохраняет естественный `await`-стиль.
- Один источник правды для текущего стейта (`actor.getSnapshot().value`).
- Заодно фиксятся 4 баг-точки (см. выше).

### Отрицательные
- `__GOTO__`-ивенты загрязняют XState event-namespace. Mitigation: префиксы `__` явно сигнализируют «системное».
- Компилятор схемы — отдельный модуль, который надо поддерживать.
- DevTools не увидят `onClick`/`onInput`-вызовов как ивентов (они идут не через XState). Это сознательный trade-off.

## Связанное {#related}

- [[001-xstate-as-canonical-fsm|ADR 001]] — основа решения
- [[007-uiproxy-cleanup|ADR 007]] — cleanup-фикс, без него `pick/omit/match` не отражают реальность
- [[009-event-interception-extension|ADR 009]] — расширение набора UI-событий
- [[002-controller-vs-feature|ADR 002]] — типизация `services` опирается на этот API
- [[controller-proxy]], [[ui-proxy]], [[lifecycle]] — обновятся после имплементации
