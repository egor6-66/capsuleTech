import {
  type JSX,
  createContext,
  createEffect,
  createMemo,
  createSignal,
  onCleanup,
  useContext,
} from 'solid-js';
import { Dashboard } from '../components';
import {
  getConnectionType,
  getDomReadyTime,
  getMemoryMetrics,
  getNetworkMetrics,
  setupWebVitalsTracking,
} from '../utils';

export interface IMonitoringContextType {
  updateComponentMetric: (name: string, value: number | string) => void;
}

export const VitalsMonitoringContext = createContext<IMonitoringContextType | undefined>(undefined);

export interface VitalsMonitoringProviderProps {
  children: JSX.Element;
  showDashboard?: boolean;
}

export function VitalsMonitoringProvider(props: VitalsMonitoringProviderProps) {
  const [displayMetrics, setDisplayMetrics] = createSignal<Record<string, number>>({});
  const metricsRef: Record<string, number> = {};
  let rafId: number | null = null;
  const showDashboard = () => props.showDashboard !== false; // default true

  const updateComponentMetric = (name: string, value: number | string) => {
    if (metricsRef[name] === value) return;

    if (typeof value === 'number') {
      metricsRef[name] = value;
    }

    if (rafId === null) {
      rafId = requestAnimationFrame(() => {
        setDisplayMetrics({ ...metricsRef });
        rafId = null;
      });
    }
  };

  createEffect(() => {
    // Setup Web Vitals tracking
    const handleVitals = (metric: any) => {
      updateComponentMetric(metric.name, metric.value);
    };

    setupWebVitalsTracking(handleVitals);

    // Initial resource metrics
    const updateResourceMetrics = () => {
      const { network, bundle } = getNetworkMetrics();
      updateComponentMetric('📡 Network Load', network);
      updateComponentMetric('📦 Total Bundle', bundle);
    };

    updateResourceMetrics();
    setTimeout(updateResourceMetrics, 2000);

    // Memory monitoring
    const memoryInterval = setInterval(() => {
      const mem = getMemoryMetrics();
      if (mem !== null) {
        updateComponentMetric('💻 Memory Usage', mem);
      }
    }, 2000);

    // DOM ready time
    const domTime = getDomReadyTime();
    if (domTime !== null) {
      updateComponentMetric('⏱️ Dom Ready', domTime);
    }

    // Connection type
    const connection = getConnectionType();
    if (connection !== 'unknown') {
      updateComponentMetric('🌐 Network', connection);
    }

    // Performance Observer for new resources
    const observer = new PerformanceObserver(() => {
      updateResourceMetrics();
    });

    try {
      observer.observe({ entryTypes: ['resource'] });
    } catch {
      // Some browsers may not support resource timing
    }

    onCleanup(() => {
      clearInterval(memoryInterval);
      observer.disconnect();
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
      }
    });
  });

  const contextValue = createMemo(() => ({
    updateComponentMetric,
  }));

  return (
    <VitalsMonitoringContext.Provider value={contextValue()}>
      {props.children}
      {showDashboard() && <Dashboard metrics={displayMetrics()} />}
    </VitalsMonitoringContext.Provider>
  );
}

export function useVitalsContext(): IMonitoringContextType | undefined {
  return useContext(VitalsMonitoringContext);
}
