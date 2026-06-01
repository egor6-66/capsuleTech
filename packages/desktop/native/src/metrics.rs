//! System metrics sampling — Phase A (ADR 023).
//!
//! Provider hierarchy:
//!   SystemSampler
//!   ├── CoreProvider  (sysinfo)             — always available, cross-platform
//!   └── Vec<Box<dyn GpuProvider>>           — populated at startup from available providers
//!         ├── NvmlGpuProvider  (feature gpu-nvidia)                         ← Phase A
//!         ├── [WmiGpuProvider]  (Windows PDH, cross-vendor fallback)         ← Phase B
//!         ├── [AmdGpuProvider]  (sysfs / ADLX)                              ← Phase B
//!         └── [IntelGpuProvider]                                             ← Phase B

use serde::{Deserialize, Serialize};
use sysinfo::{
    Components, CpuRefreshKind, Disks, MemoryRefreshKind, Networks, ProcessRefreshKind,
    ProcessesToUpdate, RefreshKind, System,
};

// ─────────────────────────────────────────────────────────────
//  Payload types  (camelCase → JSON, null-semantics per ADR §1)
// ─────────────────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SystemSnapshot {
    /// Unix epoch milliseconds at moment of sample.
    pub timestamp: u64,
    pub cpu: CpuMetrics,
    pub memory: MemoryMetrics,
    pub swap: SwapMetrics,
    /// May be empty if no disks are detected.
    pub disks: Vec<DiskMetrics>,
    /// May be empty if no network interfaces are detected.
    pub networks: Vec<NetworkMetrics>,
    /// Top-N processes by CPU usage (N = topProcesses param, default 10). May be empty.
    pub processes: Vec<ProcessMetrics>,
    /// Temperature sensors; best-effort. Empty on Windows without admin rights / drivers.
    pub components: Vec<ComponentMetrics>,
    /// GPU devices from all registered providers. Empty when no provider initialised (non-NVIDIA
    /// hardware in Phase A). Never null — always an array.
    pub gpus: Vec<GpuMetrics>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CpuMetrics {
    /// Global usage 0..100.
    pub global_usage: f32,
    /// Per-logical-core usage, same range.
    pub cores: Vec<f32>,
    pub physical_count: u32,
    pub logical_count: u32,
    /// CPU base frequency in MHz, if the OS provides it. null otherwise.
    pub frequency_mhz: Option<u64>,
    /// Brand/model string from the CPU.
    pub brand: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MemoryMetrics {
    pub total_bytes: u64,
    pub used_bytes: u64,
    pub available_bytes: u64,
    /// Derived: usedBytes / totalBytes * 100, rounded to one decimal.
    pub usage_percent: f32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SwapMetrics {
    pub total_bytes: u64,
    pub used_bytes: u64,
    /// Derived: usedBytes / totalBytes * 100; 0.0 when totalBytes == 0.
    pub usage_percent: f32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DiskMetrics {
    pub name: String,
    pub mount_point: String,
    pub file_system: String,
    pub total_bytes: u64,
    pub available_bytes: u64,
    /// Derived: (total - available) / total * 100.
    pub usage_percent: f32,
    /// "SSD" | "HDD" | "Unknown"
    pub kind: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NetworkMetrics {
    pub interface_name: String,
    /// Bytes received since last refresh (delta).
    pub received_bytes: u64,
    /// Bytes transmitted since last refresh (delta).
    pub transmitted_bytes: u64,
    /// Cumulative received bytes since OS boot.
    pub total_received_bytes: u64,
    /// Cumulative transmitted bytes since OS boot.
    pub total_transmitted_bytes: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProcessMetrics {
    pub pid: u32,
    pub name: String,
    /// CPU usage %; may exceed 100 on multi-core systems.
    pub cpu_usage: f32,
    pub memory_bytes: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ComponentMetrics {
    pub label: String,
    /// Current temperature in °C; null if sensor did not respond.
    pub temperature_c: Option<f32>,
    /// Max temperature in °C; null if unknown.
    pub max_c: Option<f32>,
    /// Critical temperature threshold in °C; null if unknown.
    pub critical_c: Option<f32>,
}

/// GPU vendor discriminant — matches "vendor" field in ADR §1.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum GpuVendor {
    Nvidia,
    Amd,
    Intel,
    Unknown,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GpuMetrics {
    pub vendor: GpuVendor,
    pub name: String,
    /// Overall GPU utilisation 0..100; null if vendor did not provide.
    pub utilization_percent: Option<f32>,
    /// Total VRAM in bytes; null if unavailable.
    pub memory_total_bytes: Option<u64>,
    /// Used VRAM in bytes; null if unavailable.
    pub memory_used_bytes: Option<u64>,
    /// Derived from VRAM info; null if either field is null.
    pub memory_usage_percent: Option<f32>,
    /// GPU die temperature in °C; null if unavailable.
    pub temperature_c: Option<f32>,
    /// Power consumption in Watts; null if unavailable.
    pub power_watts: Option<f32>,
    /// Core/SM clock in MHz; null if unavailable.
    pub core_clock_mhz: Option<u32>,
    /// Fan speed 0..100 %; null if unavailable or no fan.
    pub fan_percent: Option<f32>,
}

// ─────────────────────────────────────────────────────────────
//  GPU provider abstraction
// ─────────────────────────────────────────────────────────────

/// Extension point for GPU vendors. Phase B adds WmiGpuProvider / AmdGpuProvider /
/// IntelGpuProvider as additional `impl GpuProvider` registered in `build_gpu_providers()`.
pub trait GpuProvider: Send {
    /// Vendor discriminant — used by the provider registry and for diagnostics/logging.
    #[allow(dead_code)]
    fn vendor(&self) -> GpuVendor;
    /// Returns metrics for all devices managed by this provider.
    /// Returns an empty Vec if no device could be sampled this tick (never panics).
    fn sample(&mut self) -> Vec<GpuMetrics>;
}

// ─────────────────────────────────────────────────────────────
//  NVIDIA provider (feature = gpu-nvidia)
// ─────────────────────────────────────────────────────────────

#[cfg(feature = "gpu-nvidia")]
mod nvidia {
    use super::{GpuMetrics, GpuProvider, GpuVendor};
    use nvml_wrapper::{enum_wrappers::device::Clock, error::NvmlError, Nvml};

    pub struct NvmlGpuProvider {
        nvml: Nvml,
    }

    impl NvmlGpuProvider {
        /// Returns `Some(provider)` when NVML initialises successfully (driver present + NVIDIA HW).
        /// Returns `None` gracefully — no panic, no stderr noise beyond the log line.
        pub fn try_init() -> Option<Self> {
            match Nvml::init() {
                Ok(nvml) => Some(Self { nvml }),
                Err(e) => {
                    // Expected on non-NVIDIA or driver-less machines — not an error.
                    log::debug!("NVML init skipped: {e}");
                    None
                }
            }
        }

        fn sample_device(&self, index: u32) -> Option<GpuMetrics> {
            let dev = self.nvml.device_by_index(index).ok()?;
            let name = dev.name().unwrap_or_else(|_| "NVIDIA GPU".to_string());

            // Each sensor independently — Err → null (not a snapshot failure).
            let utilization_percent = dev
                .utilization_rates()
                .ok()
                .map(|u| u.gpu as f32);

            let (memory_total_bytes, memory_used_bytes, memory_usage_percent) =
                match dev.memory_info() {
                    Ok(m) => {
                        let pct = if m.total > 0 {
                            Some((m.used as f32 / m.total as f32) * 100.0)
                        } else {
                            None
                        };
                        (Some(m.total), Some(m.used), pct)
                    }
                    Err(_) => (None, None, None),
                };

            let temperature_c = dev
                .temperature(nvml_wrapper::enum_wrappers::device::TemperatureSensor::Gpu)
                .ok()
                .map(|t| t as f32);

            // power_usage() returns milliwatts → convert to watts.
            let power_watts = dev
                .power_usage()
                .ok()
                .map(|mw| mw as f32 / 1000.0);

            let core_clock_mhz = dev
                .clock_info(Clock::SM)
                .ok();

            // fan_speed(fan_index=0) — single-fan devices; Err if no fan or multi-GPU sub-device.
            let fan_percent = match dev.fan_speed(0) {
                Ok(f) => Some(f as f32),
                Err(NvmlError::NotSupported) | Err(NvmlError::InvalidArg) => None,
                Err(_) => None,
            };

            Some(GpuMetrics {
                vendor: GpuVendor::Nvidia,
                name,
                utilization_percent,
                memory_total_bytes,
                memory_used_bytes,
                memory_usage_percent,
                temperature_c,
                power_watts,
                core_clock_mhz,
                fan_percent,
            })
        }
    }

    impl GpuProvider for NvmlGpuProvider {
        fn vendor(&self) -> GpuVendor {
            GpuVendor::Nvidia
        }

        fn sample(&mut self) -> Vec<GpuMetrics> {
            let count = match self.nvml.device_count() {
                Ok(c) => c,
                Err(_) => return vec![],
            };
            (0..count)
                .filter_map(|i| self.sample_device(i))
                .collect()
        }
    }
}

// ─────────────────────────────────────────────────────────────
//  Provider registry factory
//  Phase B: add new `impl GpuProvider` + push into the Vec here.
// ─────────────────────────────────────────────────────────────

fn build_gpu_providers() -> Vec<Box<dyn GpuProvider>> {
    #[allow(unused_mut)]
    let mut providers: Vec<Box<dyn GpuProvider>> = Vec::new();

    // Phase A — NVIDIA (runtime libloading, graceful if no driver)
    #[cfg(feature = "gpu-nvidia")]
    if let Some(p) = nvidia::NvmlGpuProvider::try_init() {
        providers.push(Box::new(p));
    }

    // Phase B insertion points:
    // if let Some(p) = wmi::WmiGpuProvider::try_init() { providers.push(Box::new(p)); }
    // if let Some(p) = amd::AmdGpuProvider::try_init() { providers.push(Box::new(p)); }
    // if let Some(p) = intel::IntelGpuProvider::try_init() { providers.push(Box::new(p)); }

    providers
}

// ─────────────────────────────────────────────────────────────
//  CoreProvider — sysinfo-backed, always available
// ─────────────────────────────────────────────────────────────

struct CoreProvider {
    system: System,
    disks: Disks,
    networks: Networks,
    components: Components,
}

impl CoreProvider {
    fn new() -> Self {
        let mut system = System::new_with_specifics(
            RefreshKind::nothing()
                .with_cpu(CpuRefreshKind::everything())
                .with_memory(MemoryRefreshKind::everything()),
        );
        // Initial refresh to seed delta-based metrics (CPU%, network deltas).
        system.refresh_cpu_all();
        system.refresh_memory();

        let disks = Disks::new_with_refreshed_list();
        let networks = Networks::new_with_refreshed_list();
        let mut components = Components::new_with_refreshed_list();

        // Seed components
        components.refresh(true);

        // Initial process seed — required for CPU% on subsequent refresh
        system.refresh_processes_specifics(
            ProcessesToUpdate::All,
            true,
            ProcessRefreshKind::nothing().with_cpu().with_memory(),
        );

        Self {
            system,
            disks,
            networks,
            components,
        }
    }

    fn sample(&mut self, top_processes: u32) -> SystemSnapshot {
        use std::time::{SystemTime, UNIX_EPOCH};

        // Refresh all subsystems
        self.system.refresh_cpu_all();
        self.system
            .refresh_memory_specifics(MemoryRefreshKind::everything());
        self.system.refresh_processes_specifics(
            ProcessesToUpdate::All,
            true,
            ProcessRefreshKind::nothing().with_cpu().with_memory(),
        );
        self.disks.refresh(true);
        self.networks.refresh(true);
        self.components.refresh(false);

        let timestamp = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .map(|d| d.as_millis() as u64)
            .unwrap_or(0);

        // CPU
        let global_usage = self.system.global_cpu_usage();
        let cores: Vec<f32> = self.system.cpus().iter().map(|c| c.cpu_usage()).collect();
        let physical_count = System::physical_core_count().unwrap_or(0) as u32;
        let logical_count = self.system.cpus().len() as u32;
        // sysinfo reports frequency per-core; take first core as representative.
        let frequency_mhz = self
            .system
            .cpus()
            .first()
            .map(|c| c.frequency())
            .filter(|&f| f > 0);
        let brand = self
            .system
            .cpus()
            .first()
            .map(|c| c.brand().to_string())
            .unwrap_or_default();
        let cpu = CpuMetrics {
            global_usage,
            cores,
            physical_count,
            logical_count,
            frequency_mhz,
            brand,
        };

        // Memory
        let total_bytes = self.system.total_memory();
        let used_bytes = self.system.used_memory();
        let available_bytes = self.system.available_memory();
        let usage_percent = if total_bytes > 0 {
            (used_bytes as f32 / total_bytes as f32) * 100.0
        } else {
            0.0
        };
        let memory = MemoryMetrics {
            total_bytes,
            used_bytes,
            available_bytes,
            usage_percent,
        };

        // Swap
        let swap_total = self.system.total_swap();
        let swap_used = self.system.used_swap();
        let swap_pct = if swap_total > 0 {
            (swap_used as f32 / swap_total as f32) * 100.0
        } else {
            0.0
        };
        let swap = SwapMetrics {
            total_bytes: swap_total,
            used_bytes: swap_used,
            usage_percent: swap_pct,
        };

        // Disks
        let disks: Vec<DiskMetrics> = self
            .disks
            .list()
            .iter()
            .map(|d| {
                let total = d.total_space();
                let available = d.available_space();
                let disk_pct = if total > 0 {
                    ((total - available) as f32 / total as f32) * 100.0
                } else {
                    0.0
                };
                let kind = match d.kind() {
                    sysinfo::DiskKind::SSD => "SSD",
                    sysinfo::DiskKind::HDD => "HDD",
                    _ => "Unknown",
                };
                DiskMetrics {
                    name: d.name().to_string_lossy().to_string(),
                    mount_point: d.mount_point().to_string_lossy().to_string(),
                    file_system: String::from_utf8_lossy(d.file_system().as_encoded_bytes()).to_string(),
                    total_bytes: total,
                    available_bytes: available,
                    usage_percent: disk_pct,
                    kind: kind.to_string(),
                }
            })
            .collect();

        // Networks
        let networks: Vec<NetworkMetrics> = self
            .networks
            .list()
            .iter()
            .map(|(name, data)| NetworkMetrics {
                interface_name: name.clone(),
                received_bytes: data.received(),
                transmitted_bytes: data.transmitted(),
                total_received_bytes: data.total_received(),
                total_transmitted_bytes: data.total_transmitted(),
            })
            .collect();

        // Top-N processes by CPU usage
        let top_n = top_processes as usize;
        let mut procs: Vec<ProcessMetrics> = self
            .system
            .processes()
            .values()
            .map(|p| ProcessMetrics {
                pid: p.pid().as_u32(),
                name: p.name().to_string_lossy().to_string(),
                cpu_usage: p.cpu_usage(),
                memory_bytes: p.memory(),
            })
            .collect();
        procs.sort_by(|a, b| b.cpu_usage.partial_cmp(&a.cpu_usage).unwrap_or(std::cmp::Ordering::Equal));
        procs.truncate(top_n);

        // Components (temperatures)
        let components: Vec<ComponentMetrics> = self
            .components
            .list()
            .iter()
            .map(|c| ComponentMetrics {
                label: c.label().to_string(),
                // temperature() returns Option<f32> on sysinfo 0.39
                temperature_c: c.temperature(),
                max_c: c.max(),
                critical_c: c.critical(),
            })
            .collect();

        SystemSnapshot {
            timestamp,
            cpu,
            memory,
            swap,
            disks,
            networks,
            processes: procs,
            components,
            gpus: vec![], // filled by SystemSampler after calling GPU providers
        }
    }
}

// ─────────────────────────────────────────────────────────────
//  SystemSampler — public facade, held in Tauri State
// ─────────────────────────────────────────────────────────────

pub struct SystemSampler {
    core: CoreProvider,
    gpu_providers: Vec<Box<dyn GpuProvider>>,
    top_processes: u32,
}

impl SystemSampler {
    pub fn new(top_processes: u32) -> Self {
        Self {
            core: CoreProvider::new(),
            gpu_providers: build_gpu_providers(),
            top_processes,
        }
    }

    /// Take a full system snapshot. Thread-safe via the Mutex wrapper in Tauri State.
    pub fn snapshot(&mut self) -> SystemSnapshot {
        let mut snap = self.core.sample(self.top_processes);
        let mut gpus: Vec<GpuMetrics> = Vec::new();
        for provider in &mut self.gpu_providers {
            gpus.extend(provider.sample());
        }
        snap.gpus = gpus;
        snap
    }

    pub fn set_top_processes(&mut self, n: u32) {
        self.top_processes = n;
    }
}
