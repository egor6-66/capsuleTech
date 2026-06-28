import { type Component, type JSX, onCleanup, onMount, Show } from 'solid-js';
import { useProfiler } from '../api/useProfiler';
import type { ICollector } from '../core/schema';
import { connectionCollector } from './connection';
import { domStatsCollector, type IDomStatsOpts } from './domStats';
import { errorsCollector } from './errors';
import { eventTimingCollector, type IEventTimingOpts } from './eventTiming';
import { fpsCollector, type IFpsOpts } from './fps';
import { type ILoafOpts, loafCollector } from './loaf';
import { type ILongTasksOpts, longTasksCollector } from './longTasks';
import { type IMemoryOpts, memoryCollector } from './memory';
import { navigationCollector } from './navigation';
import { type INetworkOpts, networkCollector } from './network';
import { type INetworkDeepOpts, networkDeepCollector } from './networkDeep';
import { userTimingCollector } from './userTiming';
import { type IWebVitalsOpts, webVitalsCollector } from './webVitals';

/**
 * Оборачивает `ICollector`-фабрику в само-регистрирующийся Solid-компонент
 * (ADR 063 D2). На маунте дёргает `collector.init(bus)` под текущим
 * `ProfilerContext`, на unmount — cleanup. Рендерит `null` — это плагин, не
 * визуальный узел, и может стоять где угодно в дереве под `<ProfilerProvider>`.
 *
 * Гранулярность даёт tree-shake: смонтировал `<FpsCollector/>` — в бандл попал
 * только он, не все 13.
 */
function collectorComponent<P extends object = Record<never, never>>(
  factory: (opts: P) => ICollector,
): Component<P> {
  return (props) => {
    const bus = useProfiler();
    onMount(() => onCleanup(factory(props as P).init(bus)));
    return null;
  };
}

export const WebVitalsCollector = collectorComponent((o: IWebVitalsOpts) => webVitalsCollector(o));
export const MemoryCollector = collectorComponent((o: IMemoryOpts) => memoryCollector(o));
export const NetworkCollector = collectorComponent((o: INetworkOpts) => networkCollector(o));
export const NavigationCollector = collectorComponent(() => navigationCollector());
export const ConnectionCollector = collectorComponent(() => connectionCollector());
export const LongTasksCollector = collectorComponent((o: ILongTasksOpts) => longTasksCollector(o));
export const LoafCollector = collectorComponent((o: ILoafOpts) => loafCollector(o));
export const EventTimingCollector = collectorComponent((o: IEventTimingOpts) =>
  eventTimingCollector(o),
);
export const FpsCollector = collectorComponent((o: IFpsOpts) => fpsCollector(o));
export const DomStatsCollector = collectorComponent((o: IDomStatsOpts) => domStatsCollector(o));
export const ErrorsCollector = collectorComponent(() => errorsCollector());
export const UserTimingCollector = collectorComponent(() => userTimingCollector());
/** opt-in: monkey-patches fetch/XHR/WebSocket — не входит в дефолтные пресеты. */
export const NetworkDeepCollector = collectorComponent((o: INetworkDeepOpts) =>
  networkDeepCollector(o),
);

export interface ICollectorsProps {
  /**
   * Набор коллекторов. `all-except-deep` (дефолт) — всё кроме monkey-patch'ащего
   * `networkDeep`; `all` — добавляет его; `legacy` — только web-vitals/memory/
   * network/navigation/connection.
   */
  preset?: 'all' | 'all-except-deep' | 'legacy';
}

/**
 * Opt-in комбо (ADR 063 D3): монтирует НАБОР коллекторов разом. Это удобная
 * композиция, а не дефолт — кто хочет один коллектор, берёт его компонент
 * индивидуально (комбо тянет в бандл весь свой набор).
 */
export function Collectors(props: ICollectorsProps): JSX.Element {
  const preset = () => props.preset ?? 'all-except-deep';
  return (
    <>
      <WebVitalsCollector />
      <MemoryCollector />
      <NetworkCollector />
      <NavigationCollector />
      <ConnectionCollector />
      <Show when={preset() !== 'legacy'}>
        <LongTasksCollector />
        <LoafCollector />
        <EventTimingCollector />
        <FpsCollector />
        <DomStatsCollector />
        <ErrorsCollector />
        <UserTimingCollector />
      </Show>
      <Show when={preset() === 'all'}>
        <NetworkDeepCollector />
      </Show>
    </>
  );
}
