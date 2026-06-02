mod metrics;

use metrics::{SystemSampler, SystemSnapshot};
use std::sync::{Arc, Mutex};
use tauri::{AppHandle, Emitter, State, WindowEvent};
use tokio::sync::{mpsc, oneshot};

// ─────────────────────────────────────────────────────────────
//  COM-apartment invariant (Windows)
//
//  On Windows, COM is per-thread and per-apartment. `tao` (the
//  Tauri windowing layer) calls `OleInitialize` on the MAIN
//  THREAD in STA mode. sysinfo `Components` (WMI) and
//  nvml-wrapper `Nvml::init()` (NVML) both initialize COM in
//  MTA mode. If any of these run on the main thread BEFORE
//  `tauri::Builder::run()`, the subsequent `OleInitialize` call
//  returns `RPC_E_CHANGED_MODE` → panic at window creation.
//
//  Fix: `SystemSampler` is created and owned entirely by a
//  dedicated `std::thread` (the "sampler thread"). The main
//  thread is never touched by sysinfo/NVML COM calls. All
//  access to the sampler from Tauri commands goes through an
//  `mpsc` channel. This invariant MUST be preserved when
//  adding Phase-B GPU providers (WMI, AMD, Intel) — any new
//  COM-initializing code in `SystemSampler::new` or
//  `build_gpu_providers()` is safe because it runs inside the
//  sampler thread, not on main.
// ─────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────
//  Sampler actor messages
// ─────────────────────────────────────────────────────────────

enum SamplerMsg {
    /// Request a one-shot snapshot; reply sent via the oneshot sender.
    Snapshot(oneshot::Sender<SystemSnapshot>),
    /// Update the number of top processes tracked by the sampler.
    SetTopProcesses(u32),
}

// ─────────────────────────────────────────────────────────────
//  Managed state types
//
//  `SamplerHandle` — a cloneable sender to the sampler actor
//  thread. Replaces the old `Arc<Mutex<SystemSampler>>` pattern;
//  no Mutex needed because the sampler has exclusive ownership on
//  its thread. Arc makes the sender Send + Sync + 'static so it
//  can be stored in Tauri State.
//
//  `MonitorState` — unchanged: handle for the background async
//  monitoring task.
// ─────────────────────────────────────────────────────────────

/// Sender side of the sampler actor channel.
/// Clone-able; `Send + Sync + 'static` — safe for Tauri managed state.
type SamplerHandle = Arc<mpsc::UnboundedSender<SamplerMsg>>;

/// Handle for the active background monitoring task. `None` = stopped.
type MonitorState = Arc<Mutex<Option<tauri::async_runtime::JoinHandle<()>>>>;

// ─────────────────────────────────────────────────────────────
//  Commands
// ─────────────────────────────────────────────────────────────

/// One-shot pull: returns a single `SystemSnapshot` immediately.
///
/// Now async — dispatches a `Snapshot` message to the sampler thread and
/// awaits the oneshot reply. From JavaScript this is transparent; `invoke()`
/// always returns a Promise.
#[tauri::command]
async fn get_system_snapshot(handle: State<'_, SamplerHandle>) -> Result<SystemSnapshot, String> {
    let (tx, rx) = oneshot::channel();
    handle
        .send(SamplerMsg::Snapshot(tx))
        .map_err(|_| "sampler thread gone".to_string())?;
    rx.await.map_err(|_| "sampler reply dropped".to_string())
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
    handle: State<'_, SamplerHandle>,
    monitor: State<'_, MonitorState>,
) -> Result<(), String> {
    let effective_ms = interval_ms.max(200);
    let effective_top = if top_processes == 0 { 10 } else { top_processes };

    // Send the new top_processes setting to the sampler actor.
    handle
        .send(SamplerMsg::SetTopProcesses(effective_top))
        .map_err(|_| "sampler thread gone".to_string())?;

    // Abort previous task if any.
    {
        let mut guard = monitor.inner().lock().unwrap();
        if let Some(old) = guard.take() {
            old.abort();
        }
    }

    // Clone the handle and monitor arc for use in the async task.
    let handle_clone = Arc::clone(handle.inner());
    let monitor_arc = Arc::clone(monitor.inner());

    let task_handle = tauri::async_runtime::spawn(async move {
        let mut interval =
            tokio::time::interval(tokio::time::Duration::from_millis(effective_ms));
        interval.set_missed_tick_behavior(tokio::time::MissedTickBehavior::Skip);

        loop {
            interval.tick().await;

            // Request snapshot from the sampler actor via oneshot.
            let snapshot = {
                let (tx, rx) = oneshot::channel();
                if handle_clone.send(SamplerMsg::Snapshot(tx)).is_err() {
                    // Sampler thread died — stop monitoring.
                    break;
                }
                match rx.await {
                    Ok(snap) => snap,
                    Err(_) => break, // reply dropped
                }
            };

            // If the window is gone, emit fails — we stop the task cleanly.
            if app.emit("system://metrics", &snapshot).is_err() {
                break;
            }
        }

        // Task ended (window closed, aborted, or sampler gone) — clear the handle slot.
        let mut guard = monitor_arc.lock().unwrap();
        *guard = None;
    });

    // Store the new handle.
    {
        let mut guard = monitor.inner().lock().unwrap();
        *guard = Some(task_handle);
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
    // ── Sampler actor thread ──────────────────────────────────
    //
    // `SystemSampler::new()` calls sysinfo (WMI on Windows) and
    // optionally nvml-wrapper (NVIDIA NVML) — both initialize COM
    // in MTA mode. This MUST happen on a dedicated thread, never
    // on the main thread, to keep the main thread COM-free so
    // that tao's `OleInitialize` (STA) can succeed.
    //
    // See "COM-apartment invariant" comment at the top of this file.
    let (sampler_tx, mut sampler_rx) = mpsc::unbounded_channel::<SamplerMsg>();

    std::thread::spawn(move || {
        // SystemSampler::new() initializes sysinfo + GPU providers here,
        // on the sampler thread — safe, main thread stays COM-clean.
        let mut sampler = SystemSampler::new(10);

        // Process messages until the sender side is dropped (app exit).
        while let Some(msg) = sampler_rx.blocking_recv() {
            match msg {
                SamplerMsg::Snapshot(reply_tx) => {
                    // Ignore send error — receiver may have been dropped if
                    // the command future was cancelled (e.g. window closed).
                    let _ = reply_tx.send(sampler.snapshot());
                }
                SamplerMsg::SetTopProcesses(n) => {
                    sampler.set_top_processes(n);
                }
            }
        }
    });

    let sampler_handle: SamplerHandle = Arc::new(sampler_tx);
    let monitor: MonitorState = Arc::new(Mutex::new(None));

    // Clone monitor handle for the window-event cleanup hook.
    let monitor_for_event = Arc::clone(&monitor);

    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .manage(sampler_handle)
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
