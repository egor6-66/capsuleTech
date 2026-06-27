import { createContext, useContext } from 'solid-js';
import type { ITraceBus } from '../core/trace';

/** Контекст trace-потока — `ProfilerProvider` кладёт сюда созданный `ITraceBus`. */
export const TraceContext = createContext<ITraceBus | undefined>(undefined);

/** Trace-bus из контекста или `undefined` вне `ProfilerProvider`. */
export function useTraceBus(): ITraceBus | undefined {
  return useContext(TraceContext);
}
