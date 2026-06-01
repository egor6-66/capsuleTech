/**
 * Characterization tests for the SystemSnapshot TypeScript contract (ADR 023, Phase A).
 *
 * These tests guard the SHAPE of the contract — they ensure the TypeScript type
 * definitions match the documented camelCase key names and null-semantics from ADR §1.
 * They are NOT runtime tests of the Rust code (that runs inside Tauri).
 *
 * Strategy: use `satisfies` / type-assertion pattern to catch renames / additions
 * / removals of required fields at compile time, and use runtime checks to assert
 * the documented key-name conventions (camelCase, nullable vs non-nullable).
 */

import { describe, expect, it } from 'vitest';
import type {
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
} from '../metrics';

// ─────────────────────────────────────────────────────────────
//  Helper: build a minimal valid SystemSnapshot for shape checks.
//  If the TypeScript type changes (e.g. a field is renamed), this
//  fixture will fail to compile — catching the drift immediately.
// ─────────────────────────────────────────────────────────────

function makeSnapshot(): SystemSnapshot {
  const cpu: CpuMetrics = {
    globalUsage: 23.4,
    cores: [12.0, 40.1, 8.3, 55.0],
    physicalCount: 8,
    logicalCount: 16,
    frequencyMhz: 3600,
    brand: 'AMD Ryzen 7 5800X',
  };

  const memory: MemoryMetrics = {
    totalBytes: 34359738368,
    usedBytes: 18253611008,
    availableBytes: 16106127360,
    usagePercent: 53.1,
  };

  const swap: SwapMetrics = {
    totalBytes: 8589934592,
    usedBytes: 1073741824,
    usagePercent: 12.5,
  };

  const disk: DiskMetrics = {
    name: 'C:',
    mountPoint: 'C:\\',
    fileSystem: 'NTFS',
    totalBytes: 512110190592,
    availableBytes: 210123456789,
    usagePercent: 58.9,
    kind: 'SSD',
  };

  const network: NetworkMetrics = {
    interfaceName: 'Ethernet',
    receivedBytes: 1024,
    transmittedBytes: 512,
    totalReceivedBytes: 9876543210,
    totalTransmittedBytes: 1234567890,
  };

  const process: ProcessMetrics = {
    pid: 4242,
    name: 'node',
    cpuUsage: 14.2,
    memoryBytes: 524288000,
  };

  const component: ComponentMetrics = {
    label: 'CPU Tctl',
    temperatureC: 58.0,
    maxC: 95.0,
    criticalC: 100.0,
  };

  const gpu: GpuMetrics = {
    vendor: 'nvidia' satisfies GpuVendor,
    name: 'NVIDIA GeForce RTX 3080',
    utilizationPercent: 47.0,
    memoryTotalBytes: 12884901888,
    memoryUsedBytes: 4294967296,
    memoryUsagePercent: 33.3,
    temperatureC: 62.0,
    powerWatts: 145.0,
    coreClockMhz: 1800,
    fanPercent: 40.0,
  };

  return {
    timestamp: 1730000000000,
    cpu,
    memory,
    swap,
    disks: [disk],
    networks: [network],
    processes: [process],
    components: [component],
    gpus: [gpu],
  };
}

// ─────────────────────────────────────────────────────────────
//  Null-semantics variants — verify optional sensor fields accept null
// ─────────────────────────────────────────────────────────────

function makeNullSensorSnapshot(): SystemSnapshot {
  return {
    timestamp: 1730000000001,
    cpu: {
      globalUsage: 0,
      cores: [],
      physicalCount: 1,
      logicalCount: 1,
      frequencyMhz: null, // sensor did not respond → null, not 0
      brand: '',
    },
    memory: {
      totalBytes: 0,
      usedBytes: 0,
      availableBytes: 0,
      usagePercent: 0,
    },
    swap: {
      totalBytes: 0,
      usedBytes: 0,
      usagePercent: 0,
    },
    disks: [], // empty, not null
    networks: [], // empty, not null
    processes: [], // empty, not null
    components: [
      {
        label: 'Silent sensor',
        temperatureC: null, // sensor did not respond
        maxC: null,
        criticalC: null,
      },
    ],
    gpus: [
      {
        vendor: 'nvidia',
        name: 'NVIDIA GPU',
        utilizationPercent: null,
        memoryTotalBytes: null,
        memoryUsedBytes: null,
        memoryUsagePercent: null,
        temperatureC: null,
        powerWatts: null,
        coreClockMhz: null,
        fanPercent: null,
      },
    ],
  };
}

// ─────────────────────────────────────────────────────────────
//  Tests
// ─────────────────────────────────────────────────────────────

describe('SystemSnapshot contract shape (ADR 023 §1)', () => {
  it('full snapshot has the correct top-level keys in camelCase', () => {
    const snap = makeSnapshot();
    // Verify top-level key names match the ADR contract exactly.
    expect(Object.keys(snap)).toEqual(
      expect.arrayContaining([
        'timestamp',
        'cpu',
        'memory',
        'swap',
        'disks',
        'networks',
        'processes',
        'components',
        'gpus',
      ]),
    );
  });

  it('cpu field has correct camelCase keys', () => {
    const { cpu } = makeSnapshot();
    expect(Object.keys(cpu)).toEqual(
      expect.arrayContaining([
        'globalUsage',
        'cores',
        'physicalCount',
        'logicalCount',
        'frequencyMhz',
        'brand',
      ]),
    );
  });

  it('memory field has correct camelCase keys', () => {
    const { memory } = makeSnapshot();
    expect(Object.keys(memory)).toEqual(
      expect.arrayContaining(['totalBytes', 'usedBytes', 'availableBytes', 'usagePercent']),
    );
  });

  it('swap field has correct camelCase keys', () => {
    const { swap } = makeSnapshot();
    expect(Object.keys(swap)).toEqual(
      expect.arrayContaining(['totalBytes', 'usedBytes', 'usagePercent']),
    );
  });

  it('disk entry has correct camelCase keys including kind', () => {
    const { disks } = makeSnapshot();
    expect(disks).toHaveLength(1);
    expect(Object.keys(disks[0])).toEqual(
      expect.arrayContaining([
        'name',
        'mountPoint',
        'fileSystem',
        'totalBytes',
        'availableBytes',
        'usagePercent',
        'kind',
      ]),
    );
  });

  it('disk kind values are exactly SSD | HDD | Unknown', () => {
    const disk: DiskMetrics = makeSnapshot().disks[0];
    expect(['SSD', 'HDD', 'Unknown']).toContain(disk.kind);
  });

  it('network entry has correct camelCase keys', () => {
    const { networks } = makeSnapshot();
    expect(networks).toHaveLength(1);
    expect(Object.keys(networks[0])).toEqual(
      expect.arrayContaining([
        'interfaceName',
        'receivedBytes',
        'transmittedBytes',
        'totalReceivedBytes',
        'totalTransmittedBytes',
      ]),
    );
  });

  it('process entry has correct camelCase keys', () => {
    const { processes } = makeSnapshot();
    expect(processes).toHaveLength(1);
    expect(Object.keys(processes[0])).toEqual(
      expect.arrayContaining(['pid', 'name', 'cpuUsage', 'memoryBytes']),
    );
  });

  it('component entry has correct camelCase keys', () => {
    const { components } = makeSnapshot();
    expect(components).toHaveLength(1);
    expect(Object.keys(components[0])).toEqual(
      expect.arrayContaining(['label', 'temperatureC', 'maxC', 'criticalC']),
    );
  });

  it('gpu entry has all expected camelCase keys', () => {
    const { gpus } = makeSnapshot();
    expect(gpus).toHaveLength(1);
    expect(Object.keys(gpus[0])).toEqual(
      expect.arrayContaining([
        'vendor',
        'name',
        'utilizationPercent',
        'memoryTotalBytes',
        'memoryUsedBytes',
        'memoryUsagePercent',
        'temperatureC',
        'powerWatts',
        'coreClockMhz',
        'fanPercent',
      ]),
    );
  });

  it('GpuVendor literals are lowercase (nvidia | amd | intel | unknown)', () => {
    const vendors: GpuVendor[] = ['nvidia', 'amd', 'intel', 'unknown'];
    for (const v of vendors) {
      expect(v).toMatch(/^[a-z]+$/);
    }
  });

  it('timestamp is a number (epoch ms)', () => {
    const snap = makeSnapshot();
    expect(typeof snap.timestamp).toBe('number');
    expect(snap.timestamp).toBeGreaterThan(0);
  });
});

describe('SystemSnapshot null-semantics (ADR 023 §1)', () => {
  it('frequencyMhz can be null (sensor did not respond)', () => {
    const snap = makeNullSensorSnapshot();
    expect(snap.cpu.frequencyMhz).toBeNull();
  });

  it('component temperature fields can all be null', () => {
    const snap = makeNullSensorSnapshot();
    const comp = snap.components[0];
    expect(comp.temperatureC).toBeNull();
    expect(comp.maxC).toBeNull();
    expect(comp.criticalC).toBeNull();
  });

  it('all GPU sensor fields can be null independently', () => {
    const snap = makeNullSensorSnapshot();
    const gpu = snap.gpus[0];
    expect(gpu.utilizationPercent).toBeNull();
    expect(gpu.memoryTotalBytes).toBeNull();
    expect(gpu.memoryUsedBytes).toBeNull();
    expect(gpu.memoryUsagePercent).toBeNull();
    expect(gpu.temperatureC).toBeNull();
    expect(gpu.powerWatts).toBeNull();
    expect(gpu.coreClockMhz).toBeNull();
    expect(gpu.fanPercent).toBeNull();
  });

  it('array fields are never null — empty array when no data', () => {
    const snap = makeNullSensorSnapshot();
    expect(snap.disks).toBeInstanceOf(Array);
    expect(snap.networks).toBeInstanceOf(Array);
    expect(snap.processes).toBeInstanceOf(Array);
    // components and gpus have entries but the key point is they are arrays
    expect(snap.components).toBeInstanceOf(Array);
    expect(snap.gpus).toBeInstanceOf(Array);
  });

  it('gpus can be empty array (no GPU provider registered)', () => {
    const snap: SystemSnapshot = { ...makeSnapshot(), gpus: [] };
    expect(snap.gpus).toHaveLength(0);
    expect(snap.gpus).not.toBeNull();
  });
});
