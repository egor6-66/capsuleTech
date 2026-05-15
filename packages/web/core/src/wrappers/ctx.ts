import { createContext, useContext } from 'solid-js';
import type { AnyStateMachine } from 'xstate';

export interface ICtx<T extends AnyStateMachine> {
  state: T;
  store: any;
  controller: any;
  parent: any;
}

export const Context = createContext<ICtx<any>>();

export const useCtx = <T extends AnyStateMachine>() => useContext(Context) as ICtx<T>;
