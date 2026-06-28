// Компоненты-читатели (`*Reporter`, публичная capability ADR 063 D2) +
// сырые фабрики (`*reporter`, примитивы под компонентами / ручную композицию).
export type { IBeaconReporterOpts } from './beacon';
export { beaconReporter } from './beacon';
export { callbackReporter } from './callback';
export {
  BeaconReporter,
  CallbackReporter,
  ConsoleReporter,
  TraceBeaconReporter,
  TraceCallbackReporter,
  TraceConsoleReporter,
} from './components';
export type { IConsoleReporterOpts } from './console';
export { consoleReporter } from './console';
export type {
  ITraceBeaconReporterOpts,
  ITraceConsoleReporterOpts,
  ITraceReporter,
} from './trace';
export { traceBeaconReporter, traceCallbackReporter, traceConsoleReporter } from './trace';
