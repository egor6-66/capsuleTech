import { type AnyStateMachine, assign, createMachine } from 'xstate';

export interface IStateHandlers {
  onInit?: (api: any) => any;
  onExit?: (api: any) => any;
  [methodName: string]: ((api: any) => any) | undefined;
}

export interface IDefineStateSchema<TCtx = any> {
  initial: string;
  context?: TCtx;
  states: Record<string, IStateHandlers>;
  [methodName: string]: any;
}

export interface IMachineContext<TCtx = any> {
  data: TCtx;
  loading: boolean;
  errors: Record<string, string>;
  styles: Record<string, string>;
  components: Record<string, any>;
  /**
   * Динамические patch'и props у компонентов, индексированные по id.
   * Контроллер пишет сюда через `store.setProps({...})`; UiProxy при рендере
   * мержит эти значения поверх статичных props у компонента с тем же id.
   * Канал общего назначения — для `active`, кастомных флагов, и пр.
   */
  props: Record<string, Record<string, any>>;
}

/**
 * Строит XState-машину из пользовательской HCA-схемы.
 * Машина владеет: списком стейтов, переходами (через __GOTO_*) и универсальными store-мутациями.
 * UI-события (onClick, onInput, ...) и onInit/onExit обрабатываются НЕ через XState event-bus —
 * см. ControllerProxy + createLogicWrapper.
 */
export const createState = <TCtx = any>(schema: IDefineStateSchema<TCtx>): AnyStateMachine => {
  const stateNames = Object.keys(schema.states);

  const gotoTransitions: Record<string, any> = {};
  for (const name of stateNames) {
    gotoTransitions[`__GOTO_${name}__`] = { target: `.${name}` };
  }

  return createMachine({
    id: 'capsule-fsm',
    initial: schema.initial,
    context: {
      data: (schema.context ?? {}) as any,
      loading: false,
      errors: {},
      styles: {},
      components: {},
      props: {},
    },
    states: Object.fromEntries(stateNames.map((s) => [s, {}])) as any,
    on: {
      ...gotoTransitions,
      SET_DATA: {
        actions: assign({
          data: ({ context, event }: any) => ({ ...context.data, ...event.payload }),
        }),
      },
      SET_LOADING: {
        actions: assign({ loading: ({ event }: any) => event.value }),
      },
      SET_STYLES: {
        actions: assign({ styles: ({ event }: any) => event.styles }),
      },
      SET_ERRORS: {
        actions: assign({ errors: ({ event }: any) => event.errors }),
      },
      REGISTER_COMPONENT: {
        actions: assign({
          components: ({ context, event }: any) => ({
            ...context.components,
            ...event.payload,
          }),
        }),
      },
      UNREGISTER_COMPONENT: {
        actions: assign({
          components: ({ context, event }: any) => {
            const { [event.id]: _, ...rest } = context.components;
            return rest;
          },
          props: ({ context, event }: any) => {
            const { [event.id]: _, ...rest } = context.props;
            return rest;
          },
        }),
      },
      // Per-id patch'и props: мержим поверх существующего, без полной замены.
      // payload — `{ [id]: { propName: value, ... } }`.
      SET_PROPS: {
        actions: assign({
          props: ({ context, event }: any) => {
            const next = { ...context.props };
            for (const [id, patch] of Object.entries(event.payload as Record<string, any>)) {
              next[id] = { ...(next[id] ?? {}), ...patch };
            }
            return next;
          },
        }),
      },
    },
  });
};
