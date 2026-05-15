import { type Metric, onCLS, onFCP, onINP, onLCP, onTTFB } from 'web-vitals';

export interface MetricRating {
  label: 'GOOD' | 'NEEDS_IMPROVEMENT' | 'POOR' | 'INFO';
  color: string;
  unit: string;
}

export function getRating(metricName: string, value: number): MetricRating {
  // Web Vitals thresholds
  // https://web.dev/vitals/

  if (metricName.includes('FCP')) {
    // First Contentful Paint: Good < 1.8s
    if (value < 1800) return { label: 'GOOD', color: '#10b981', unit: 'ms' };
    if (value < 3000) return { label: 'NEEDS_IMPROVEMENT', color: '#f59e0b', unit: 'ms' };
    return { label: 'POOR', color: '#ef4444', unit: 'ms' };
  }

  if (metricName.includes('LCP')) {
    // Largest Contentful Paint: Good < 2.5s
    if (value < 2500) return { label: 'GOOD', color: '#10b981', unit: 'ms' };
    if (value < 4000) return { label: 'NEEDS_IMPROVEMENT', color: '#f59e0b', unit: 'ms' };
    return { label: 'POOR', color: '#ef4444', unit: 'ms' };
  }

  if (metricName.includes('CLS')) {
    // Cumulative Layout Shift: Good < 0.1
    if (value < 0.1) return { label: 'GOOD', color: '#10b981', unit: '' };
    if (value < 0.25) return { label: 'NEEDS_IMPROVEMENT', color: '#f59e0b', unit: '' };
    return { label: 'POOR', color: '#ef4444', unit: '' };
  }

  if (metricName.includes('INP')) {
    // Interaction to Next Paint: Good < 200ms
    if (value < 200) return { label: 'GOOD', color: '#10b981', unit: 'ms' };
    if (value < 500) return { label: 'NEEDS_IMPROVEMENT', color: '#f59e0b', unit: 'ms' };
    return { label: 'POOR', color: '#ef4444', unit: 'ms' };
  }

  if (metricName.includes('TTFB')) {
    // Time to First Byte: Good < 800ms
    if (value < 800) return { label: 'GOOD', color: '#10b981', unit: 'ms' };
    if (value < 1800) return { label: 'NEEDS_IMPROVEMENT', color: '#f59e0b', unit: 'ms' };
    return { label: 'POOR', color: '#ef4444', unit: 'ms' };
  }

  // Memory and Network
  if (metricName.includes('Memory')) {
    // Less than 50MB is good
    if (value < 50) return { label: 'GOOD', color: '#10b981', unit: 'MB' };
    if (value < 100) return { label: 'NEEDS_IMPROVEMENT', color: '#f59e0b', unit: 'MB' };
    return { label: 'POOR', color: '#ef4444', unit: 'MB' };
  }

  if (metricName.includes('Network') || metricName.includes('Bundle')) {
    if (value < 1) return { label: 'GOOD', color: '#10b981', unit: 'MB' };
    if (value < 3) return { label: 'NEEDS_IMPROVEMENT', color: '#f59e0b', unit: 'MB' };
    return { label: 'POOR', color: '#ef4444', unit: 'MB' };
  }

  return { label: 'INFO', color: '#3498db', unit: '' };
}

export function setupWebVitalsTracking(onMetric: (metric: Metric) => void) {
  onCLS(onMetric, { reportAllChanges: true });
  onLCP(onMetric, { reportAllChanges: true });
  onFCP(onMetric, { reportAllChanges: true });
  onTTFB(onMetric);
  onINP(onMetric, { reportAllChanges: true });
}

export function getNetworkMetrics() {
  const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];

  let totalNetwork = 0;
  let totalBundle = 0;

  for (const res of resources) {
    totalNetwork += res.transferSize;
    const actualSize = res.decodedBodySize || res.encodedBodySize || res.transferSize;
    totalBundle += actualSize;
  }

  return {
    network: totalNetwork / 1024 / 1024, // MB
    bundle: totalBundle / 1024 / 1024, // MB
  };
}

export function getMemoryMetrics(): number | null {
  // biome-ignore lint/suspicious/noExplicitAny: <explanation>
  const mem = (performance as any).memory;
  if (!mem) return null;
  return Math.round(mem.usedJSHeapSize / 1024 / 1024);
}

export function getConnectionType(): string {
  // biome-ignore lint/suspicious/noExplicitAny: <explanation>
  const connection = (navigator as any).connection;
  if (!connection) return 'unknown';
  return connection.effectiveType || 'unknown';
}

export function getDomReadyTime(): number | null {
  const navEntry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
  if (!navEntry) return null;
  return navEntry.domContentLoadedEventEnd;
}
