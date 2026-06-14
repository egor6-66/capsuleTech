/**
 * @capsuletech/desktop/metrics — TYPE-ONLY module (ADR 023, Phase A).
 *
 * Zero runtime — only `export interface` / `export type`. No imports, no deps.
 * Single source of truth for the SystemSnapshot contract shared between:
 *   - Rust serde structs in `native/src/metrics.rs` (camelCase via #[serde(rename_all)])
 *   - TypeScript consumers in webview (via `useDesktop()` global)
 *
 * Usage in a capsule app's Feature (canon — no imports):
 *   // useDesktop is auto-imported via HOOK_IMPORTS
 *   const desktop = useDesktop();
 *   const snap = await desktop.invoke<SystemSnapshot>('get_system_snapshot');
 *
 *   const unlisten = await desktop.listen<SystemSnapshot>('system://metrics', (e) => {
 *     store.update({ metrics: e.payload });
 *   });
 */

/** GPU vendor discriminant. Matches Rust `GpuVendor` enum (lowercase serde). */
export type GpuVendor = 'nvidia' | 'amd' | 'intel' | 'unknown';

/** CPU metrics — global and per-core usage, frequencies, brand. */
export interface CpuMetrics {
  /** Global CPU usage 0..100. */
  globalUsage: number;
  /** Per-logical-core usage, same range. */
  cores: number[];
  physicalCount: number;
  logicalCount: number;
  /**
   * CPU base frequency in MHz.
   * `null` when the OS / sysinfo does not expose it.
   */
  frequencyMhz: number | null;
  /** CPU brand/model string. */
  brand: string;
}

/** RAM (physical memory) metrics. */
export interface MemoryMetrics {
  totalBytes: number;
  usedBytes: number;
  availableBytes: number;
  /** Derived: usedBytes / totalBytes × 100, one decimal precision. */
  usagePercent: number;
}

/** Swap / page-file metrics. */
export interface SwapMetrics {
  totalBytes: number;
  usedBytes: number;
  /** 0.0 when no swap is configured (totalBytes == 0). */
  usagePercent: number;
}

/** Per-disk (partition) metrics. */
export interface DiskMetrics {
  name: string;
  mountPoint: string;
  fileSystem: string;
  totalBytes: number;
  availableBytes: number;
  /** Derived: (total - available) / total × 100. */
  usagePercent: number;
  /** "SSD" | "HDD" | "Unknown" */
  kind: 'SSD' | 'HDD' | 'Unknown';
}

/** Per-network-interface metrics. */
export interface NetworkMetrics {
  interfaceName: string;
  /** Bytes received since last monitoring tick (delta). */
  receivedBytes: number;
  /** Bytes transmitted since last monitoring tick (delta). */
  transmittedBytes: number;
  /** Cumulative received bytes since OS boot. */
  totalReceivedBytes: number;
  /** Cumulative transmitted bytes since OS boot. */
  totalTransmittedBytes: number;
}

/** Per-process metrics (top-N by CPU). */
export interface ProcessMetrics {
  pid: number;
  name: string;
  /**
   * CPU usage in %; may exceed 100 on multi-core systems
   * (sysinfo reports usage relative to a single core).
   */
  cpuUsage: number;
  /** Resident memory in bytes. */
  memoryBytes: number;
}

/**
 * Temperature sensor reading.
 * On Windows: `components` is often empty without admin rights or special drivers.
 * This is not an error — `components: []` is the expected value in that case.
 */
export interface ComponentMetrics {
  label: string;
  /** Current temperature in °C. `null` when the sensor did not respond. */
  temperatureC: number | null;
  /** Max recorded temperature in °C. `null` when unknown. */
  maxC: number | null;
  /** Critical threshold in °C. `null` when unknown. */
  criticalC: number | null;
}

/**
 * Per-GPU device metrics.
 * Phase A: NVIDIA only (via NVML). AMD / Intel → `gpus: []` until Phase B.
 * Each sensor field is independently nullable — `null` means "sensor did not respond",
 * NOT "value is zero".
 */
export interface GpuMetrics {
  vendor: GpuVendor;
  name: string;
  /** Overall GPU engine utilisation 0..100. `null` if provider did not report. */
  utilizationPercent: number | null;
  /** Total VRAM in bytes. `null` if unavailable. */
  memoryTotalBytes: number | null;
  /** Used VRAM in bytes. `null` if unavailable. */
  memoryUsedBytes: number | null;
  /** Derived from VRAM info; `null` if either memory field is `null`. */
  memoryUsagePercent: number | null;
  /** GPU die temperature in °C. `null` if unavailable. */
  temperatureC: number | null;
  /** Power draw in Watts. `null` if unavailable. */
  powerWatts: number | null;
  /** Core / SM clock in MHz. `null` if unavailable. */
  coreClockMhz: number | null;
  /** Fan speed 0..100 %. `null` if unavailable or device has no fan. */
  fanPercent: number | null;
}

/**
 * Full system snapshot — payload for the `"system://metrics"` event
 * and the return value of the `get_system_snapshot` command.
 *
 * Invariant: any sensor field that the underlying source did not provide
 * serialises as `null` (never omitted, never replaced by 0).
 * Array fields (`disks`, `networks`, `processes`, `components`, `gpus`)
 * are always arrays — never `null` — and may be empty.
 */
export interface SystemSnapshot {
  /** Unix epoch timestamp in milliseconds at the moment the snapshot was taken. */
  timestamp: number;
  cpu: CpuMetrics;
  memory: MemoryMetrics;
  swap: SwapMetrics;
  /** One entry per mounted disk partition. May be empty. */
  disks: DiskMetrics[];
  /** One entry per network interface. May be empty. */
  networks: NetworkMetrics[];
  /**
   * Top-N processes by CPU usage (N = `topProcesses` param passed to `start_monitoring`,
   * default 10). May be empty if no processes are visible.
   */
  processes: ProcessMetrics[];
  /**
   * Temperature sensors. Best-effort — commonly empty on Windows without
   * elevated privileges or specialised drivers.
   */
  components: ComponentMetrics[];
  /**
   * GPU devices from all registered providers.
   * Phase A: populated for NVIDIA only; empty on AMD / Intel hardware.
   * Phase B will add AMD / Intel providers without changing this contract.
   */
  gpus: GpuMetrics[];
}
