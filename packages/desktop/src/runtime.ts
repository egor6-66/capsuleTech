/**
 * @capsuletech/desktop/runtime — typed thin wrappers around @tauri-apps/* APIs.
 *
 * Apps reach this through the `useDesktop()` global (auto-imported via
 * @capsuletech/vite-builder HOOK_IMPORTS, like useRouter/useCtx). Pages, widgets,
 * views, controllers, features do NOT import this subpath directly — the hook is
 * the canonical access point. Runtime works under Tauri only; outside Tauri the
 * `available` flag is false and all wrappers throw (consumers handle gracefully).
 *
 * Dynamic imports keep browser bundles of non-Tauri apps functional:
 * `@tauri-apps/*` are not resolved at build time — only at runtime inside a Tauri
 * webview. If `available` is false, all wrappers throw a clear error before the
 * dynamic import is even attempted.
 */

/** Unsubscribe function returned by `listen`. */
export type UnlistenFn = () => void;

/** Options for the `dialog.open` wrapper. */
export interface DialogOpenOptions {
  multiple?: boolean;
  directory?: boolean;
  title?: string;
}

/**
 * The object returned by `useDesktop()`.
 *
 * Safe to destructure — all methods are bound to the module-level singleton,
 * not to `this`.
 */
export interface DesktopRuntime {
  /** True when running inside a Tauri webview (`window.__TAURI_INTERNALS__` present). */
  available: boolean;

  /**
   * Invoke a Tauri command defined in `packages/desktop/native/src/`.
   * Outside Tauri → throws `DesktopNotAvailableError`.
   */
  invoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T>;

  /**
   * Subscribe to a Tauri event (e.g. `"system://metrics"`).
   * Returns an unlisten function — call it to unsubscribe.
   * Outside Tauri → throws `DesktopNotAvailableError`.
   */
  listen<T>(
    event: string,
    handler: (e: { payload: T }) => void,
  ): Promise<UnlistenFn>;

  dialog: {
    /**
     * Open a native file/folder picker via `@tauri-apps/plugin-dialog`.
     * Outside Tauri → throws `DesktopNotAvailableError`.
     */
    open(opts?: DialogOpenOptions): Promise<string | string[] | null>;
  };
}

// ─── Error type ──────────────────────────────────────────────────────────────

const NOT_AVAILABLE_MSG =
  'Desktop runtime is not available — running outside Tauri.';

class DesktopNotAvailableError extends Error {
  constructor() {
    super(NOT_AVAILABLE_MSG);
    this.name = 'DesktopNotAvailableError';
  }
}

// ─── Availability detection ───────────────────────────────────────────────────

function isTauri(): boolean {
  return (
    typeof globalThis !== 'undefined' &&
    '__TAURI_INTERNALS__' in globalThis &&
    (globalThis as Record<string, unknown>)['__TAURI_INTERNALS__'] != null
  );
}

// ─── Wrappers ─────────────────────────────────────────────────────────────────

async function runtimeInvoke<T>(
  cmd: string,
  args?: Record<string, unknown>,
): Promise<T> {
  if (!isTauri()) throw new DesktopNotAvailableError();
  const { invoke } = await import('@tauri-apps/api/core');
  return invoke<T>(cmd, args);
}

async function runtimeListen<T>(
  event: string,
  handler: (e: { payload: T }) => void,
): Promise<UnlistenFn> {
  if (!isTauri()) throw new DesktopNotAvailableError();
  const { listen } = await import('@tauri-apps/api/event');
  return listen<T>(event, handler);
}

async function runtimeDialogOpen(
  opts?: DialogOpenOptions,
): Promise<string | string[] | null> {
  if (!isTauri()) throw new DesktopNotAvailableError();
  const { open } = await import('@tauri-apps/plugin-dialog');
  return open(opts ?? {});
}

// ─── Hook (singleton) ────────────────────────────────────────────────────────

/**
 * Returns the desktop runtime handle.
 *
 * This is a plain factory function (not a Solid signal) — safe to call at
 * module scope, in Feature setup, in Widget factory bodies, or anywhere else.
 * The canonical access point is via the `useDesktop` global that will be
 * registered in @capsuletech/vite-builder HOOK_IMPORTS (follow-up builders PR).
 *
 * Usage in a capsule app's Feature (no imports — global auto-injected):
 *   const desktop = useDesktop();
 *   if (!desktop.available) return;
 *   const snap = await desktop.invoke<SystemSnapshot>('get_system_snapshot');
 *
 *   const unlisten = await desktop.listen<SystemSnapshot>('system://metrics', (e) => {
 *     store.update({ metrics: e.payload });
 *   });
 *
 *   const path = await desktop.dialog.open({ multiple: false });
 */
export function useDesktop(): DesktopRuntime {
  return {
    available: isTauri(),
    invoke: runtimeInvoke,
    listen: runtimeListen,
    dialog: { open: runtimeDialogOpen },
  };
}
