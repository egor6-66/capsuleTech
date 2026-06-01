mod metrics;

use metrics::{SystemSampler, SystemSnapshot};
use std::sync::{Arc, Mutex};
use tauri::{AppHandle, Emitter, State, WindowEvent};

// ─────────────────────────────────────────────────────────────
//  Managed state types
//
//  Both are Arc<Mutex<...>> so the background async task can hold
//  a cheaply-cloned handle without unsafe or lifetime fights.
//  Tauri State<Arc<Mutex<T>>> satisfies Send + Sync + 'static.
// ─────────────────────────────────────────────────────────────

/// Persistent sampler shared between Tauri commands and the monitor task.
/// MUST stay alive across calls: sysinfo computes CPU% and network deltas as
/// differences between successive refreshes — re-creating on each tick breaks it.
type SamplerState = Arc<Mutex<SystemSampler>>;

/// Handle for the active background monitoring task. `None` = stopped.
type MonitorState = Arc<Mutex<Option<tauri::async_runtime::JoinHandle<()>>>>;

// ─────────────────────────────────────────────────────────────
//  Commands
// ─────────────────────────────────────────────────────────────

/// One-shot pull: returns a single `SystemSnapshot` immediately.
/// Safe to call any time; uses the persistent sampler for accurate deltas.
#[tauri::command]
fn get_system_snapshot(sampler: State<'_, SamplerState>) -> SystemSnapshot {
    sampler.inner().lock().unwrap().snapshot()
}

/// Start background push monitoring.
///
/// Emits `"system://metrics"` events every `interval_ms` milliseconds with a
/// `SystemSnapshot` payload. Idempotent: a running task is aborted before a new
/// one starts (allowing interval / topProcesses changes without explicit stop).
///
/// `interval_ms`: clamped to ≥ 200 ms (sysinfo `MINIMUM_CPU_UPDATE_INTERVAL`).
/// `top_processes`: processes to include by CPU; 0 → default 10.
#[tauri::command]
async fn start_monitoring(
    interval_ms: u64,
    top_processes: u32,
    app: AppHandle,
    sampler: State<'_, SamplerState>,
    monitor: State<'_, MonitorState>,
) -> Result<(), String> {
    let effective_ms = interval_ms.max(200);
    let effective_top = if top_processes == 0 { 10 } else { top_processes };

    // Apply new top_processes setting to the sampler.
    {
        sampler.inner().lock().unwrap().set_top_processes(effective_top);
    }

    // Abort previous task if any.
    {
        let mut guard = monitor.inner().lock().unwrap();
        if let Some(old) = guard.take() {
            old.abort();
        }
    }

    // Clone Arc handles for the async task — cheap, no copy of sampler data.
    let sampler_arc = Arc::clone(sampler.inner());
    let monitor_arc = Arc::clone(monitor.inner());

    let handle = tauri::async_runtime::spawn(async move {
        let mut interval =
            tokio::time::interval(tokio::time::Duration::from_millis(effective_ms));
        interval.set_missed_tick_behavior(tokio::time::MissedTickBehavior::Skip);

        loop {
            interval.tick().await;

            let snapshot = {
                let mut s = sampler_arc.lock().unwrap();
                s.snapshot()
            };

            // If the window is gone, emit fails — we stop the task cleanly.
            if app.emit("system://metrics", &snapshot).is_err() {
                break;
            }
        }

        // Task ended (window closed or aborted) — clear the handle slot.
        let mut guard = monitor_arc.lock().unwrap();
        *guard = None;
    });

    // Store the new handle.
    {
        let mut guard = monitor.inner().lock().unwrap();
        *guard = Some(handle);
    }

    Ok(())
}

/// Stop background monitoring. Idempotent — safe to call when already stopped.
#[tauri::command]
async fn stop_monitoring(monitor: State<'_, MonitorState>) -> Result<(), String> {
    let mut guard = monitor.inner().lock().unwrap();
    if let Some(h) = guard.take() {
        h.abort();
    }
    Ok(())
}

// ─────────────────────────────────────────────────────────────
//  Application entry point
// ─────────────────────────────────────────────────────────────

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let sampler: SamplerState = Arc::new(Mutex::new(SystemSampler::new(10)));
    let monitor: MonitorState = Arc::new(Mutex::new(None));

    // Clone monitor handle for the window-event cleanup hook.
    let monitor_for_event = Arc::clone(&monitor);

    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .manage(sampler)
        .manage(monitor)
        .invoke_handler(tauri::generate_handler![
            get_system_snapshot,
            start_monitoring,
            stop_monitoring,
        ])
        // Abort the monitor task when the window is destroyed to avoid emitting
        // events into a dead target.
        .on_window_event(move |_window, event| {
            if let WindowEvent::Destroyed = event {
                let mut guard = monitor_for_event.lock().unwrap();
                if let Some(h) = guard.take() {
                    h.abort();
                }
            }
        })
        .setup(|_app| Ok(()))
        .run(tauri::generate_context!())
        .expect("error while running Capsule desktop shell");
}
