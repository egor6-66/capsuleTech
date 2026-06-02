import type { SystemSnapshot } from '@capsuletech/desktop/metrics';

/**
 * metricsSource — SHARED host-metrics collector (singleton).
 *
 * System metrics describe ONE machine, so every `Features.SystemMonitor` node on
 * the canvas must reflect the SAME data. This module owns a single rolling buffer
 * fed by a single source (desktop `system://metrics` event, or a mock walk in the
 * browser) and fans it out to every subscribed Feature. Ref-counted: the source
 * starts on the first subscriber and stops on the last.
 *
 * Per-node UI state (selected time range) stays in each Feature's own store —
 * only the raw samples / latest snapshot are shared here.
 */

/** Sample interval (ms). 5s keeps readings calm — per-second metrics are noisy. */
const INTERVAL_MS = 5000;
/** Rolling-buffer cap — 1h at 5s granularity (720) + headroom. */
const MAX_SAMPLES = 1024;
const GiB = 1024 ** 3;

/** Compact per-tick point kept in the buffer (only what we chart over time). */
export interface ISample {
  t: number;
  cpu: number;
  mem: number;
  gpu: number | null;
  netRx: number;
  netTx: number;
}

/** Current snapshot-derived values for gauges / stat-cards / per-core bars. */
export interface ILatest {
  cpu: number;
  mem: number;
  gpu: number | null;
  cpuBrand: string;
  cpuCores: number;
  cpuFreqMhz: number | null;
  perCore: number[];
  memTotal: number;
  memUsed: number;
  swapPct: number;
  gpuName: string | null;
  vramUsed: number | null;
  vramTotal: number | null;
  cpuTempC: number | null;
  gpuTempC: number | null;
  netRx: number;
  netTx: number;
  topProcs: { name: string; cpu: number; mem: number }[];
}

/** Immutable view of the shared buffer pushed to subscribers each tick. */
export interface IMetricsSnapshot {
  samples: ISample[];
  latest: ILatest | null;
  available: boolean;
}

const clamp = (v: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, v));

const cpuTempFrom = (snap: SystemSnapshot): number | null => {
  const c = snap.components.find((x) => /cpu|package|tctl|tdie/i.test(x.label));
  return c?.temperatureC ?? snap.components[0]?.temperatureC ?? null;
};

const toSample = (s: SystemSnapshot): ISample => ({
  t: Date.now(),
  cpu: s.cpu.globalUsage,
  mem: s.memory.usagePercent,
  gpu: s.gpus[0]?.utilizationPercent ?? null,
  netRx: s.networks.reduce((a, n) => a + n.receivedBytes, 0),
  netTx: s.networks.reduce((a, n) => a + n.transmittedBytes, 0),
});

const toLatest = (s: SystemSnapshot): ILatest => ({
  cpu: s.cpu.globalUsage,
  mem: s.memory.usagePercent,
  gpu: s.gpus[0]?.utilizationPercent ?? null,
  cpuBrand: s.cpu.brand,
  cpuCores: s.cpu.logicalCount,
  cpuFreqMhz: s.cpu.frequencyMhz,
  perCore: s.cpu.cores,
  // sysinfo `total_memory` already sums every physical RAM module.
  memTotal: s.memory.totalBytes,
  memUsed: s.memory.usedBytes,
  swapPct: s.swap.usagePercent,
  gpuName: s.gpus[0]?.name ?? null,
  vramUsed: s.gpus[0]?.memoryUsedBytes ?? null,
  vramTotal: s.gpus[0]?.memoryTotalBytes ?? null,
  cpuTempC: cpuTempFrom(s),
  gpuTempC: s.gpus[0]?.temperatureC ?? null,
  netRx: s.networks.reduce((a, n) => a + n.receivedBytes, 0),
  netTx: s.networks.reduce((a, n) => a + n.transmittedBytes, 0),
  topProcs: s.processes
    .slice(0, 5)
    .map((p) => ({ name: p.name, cpu: p.cpuUsage, mem: p.memoryBytes })),
});

// --- singleton state ---------------------------------------------------------
const listeners = new Set<(s: IMetricsSnapshot) => void>();
let samples: ISample[] = [];
let latest: ILatest | null = null;
let available = false;
let started = false;
let unlisten: (() => void) | null = null;
let mockTimer: ReturnType<typeof setInterval> | null = null;

const emit = (): void => {
  const snap: IMetricsSnapshot = { samples, latest, available };
  for (const l of listeners) l(snap);
};

const ingest = (sample: ISample, next: ILatest): void => {
  samples = [...samples, sample];
  if (samples.length > MAX_SAMPLES) samples = samples.slice(-MAX_SAMPLES);
  latest = next;
  emit();
};

/** Synthetic random-walk for browser dev (no Tauri IPC). Gentle steps. */
const startMock = (): void => {
  available = false;
  let cpu = 28;
  let mem = 46;
  let gpu = 18;
  const cores = Array.from({ length: 8 }, () => 15 + Math.random() * 30);
  const tick = (): void => {
    cpu = clamp(cpu + (Math.random() - 0.5) * 10, 3, 97);
    mem = clamp(mem + (Math.random() - 0.5) * 3, 22, 86);
    gpu = clamp(gpu + (Math.random() - 0.5) * 12, 0, 99);
    for (let i = 0; i < cores.length; i++) {
      cores[i] = clamp((cores[i] ?? 20) + (Math.random() - 0.5) * 14, 0, 100);
    }
    const netRx = Math.random() * 5_000_000;
    const netTx = Math.random() * 1_500_000;
    ingest(
      { t: Date.now(), cpu, mem, gpu, netRx, netTx },
      {
        cpu,
        mem,
        gpu,
        cpuBrand: 'Mock CPU · browser demo',
        cpuCores: cores.length,
        cpuFreqMhz: 3600,
        perCore: [...cores],
        memTotal: 32 * GiB,
        memUsed: (mem / 100) * 32 * GiB,
        swapPct: 12,
        gpuName: 'Mock GPU · demo',
        vramUsed: (gpu / 100) * 8 * GiB,
        vramTotal: 8 * GiB,
        cpuTempC: 42 + cpu * 0.3,
        gpuTempC: 38 + gpu * 0.4,
        netRx,
        netTx,
        topProcs: [
          { name: 'chrome', cpu: 8 + Math.random() * 20, mem: 1.2 * GiB },
          { name: 'node', cpu: 4 + Math.random() * 12, mem: 0.6 * GiB },
          { name: 'capsule', cpu: 2 + Math.random() * 8, mem: 0.3 * GiB },
        ],
      },
    );
  };
  tick();
  mockTimer = setInterval(tick, INTERVAL_MS);
};

const startReal = async (): Promise<void> => {
  const { invoke } = await import('@tauri-apps/api/core');
  const { listen } = await import('@tauri-apps/api/event');
  await invoke('start_monitoring', { intervalMs: INTERVAL_MS, topProcesses: 5 });
  unlisten = await listen<SystemSnapshot>('system://metrics', (e) => {
    ingest(toSample(e.payload), toLatest(e.payload));
  });
  available = true;
  emit();
};

const start = async (): Promise<void> => {
  if (started) return;
  started = true;
  try {
    await startReal();
  } catch {
    // Not running under Tauri → animate with mock data so the widget is demoable.
    startMock();
  }
};

const stop = async (): Promise<void> => {
  started = false;
  if (unlisten) {
    unlisten();
    unlisten = null;
  }
  if (mockTimer) {
    clearInterval(mockTimer);
    mockTimer = null;
  }
  samples = [];
  latest = null;
  available = false;
  try {
    const { invoke } = await import('@tauri-apps/api/core');
    await invoke('stop_monitoring');
  } catch {
    // ignore — nothing to stop outside Tauri
  }
};

/**
 * Subscribe to the shared metrics stream. Starts the collector on the first
 * subscriber, seeds late subscribers with the current buffer immediately, and
 * stops the collector when the last subscriber leaves. Returns an unsubscribe fn.
 */
export const subscribeMetrics = (cb: (s: IMetricsSnapshot) => void): (() => void) => {
  listeners.add(cb);
  if (listeners.size === 1) {
    void start();
  } else if (latest) {
    cb({ samples, latest, available });
  }
  return () => {
    listeners.delete(cb);
    if (listeners.size === 0) void stop();
  };
};
