// Type-only re-export of metrics contract (erased at build time, no runtime cost).
export type {
  ComponentMetrics,
  CpuMetrics,
  DiskMetrics,
  GpuMetrics,
  GpuVendor,
  MemoryMetrics,
  NetworkMetrics,
  ProcessMetrics,
  SwapMetrics,
  SystemSnapshot,
} from './metrics';
export { runBuild, runDev } from './runner';
export type { IDesktopConfig, RunBuildOptions, RunDevOptions } from './types';
