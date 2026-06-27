/**
 * slot.tsx — MatrixSlot + MatrixPresetContext.
 *
 * Per-slot runtime-trace boundary (ADR 062). Wraps each cell's content render
 * so the host can observe how many times a slot's content actually mounts.
 */
import { type JSX, createContext, onCleanup, useContext } from 'solid-js';
import { trace } from '@capsuletech/web-profiler/trace';

// ---------------------------------------------------------------------------
// MatrixPresetContext — ambient preset-tag for slot traces.
//
// Set once by MatrixContent; read by MatrixSlot at mount. Carrying the preset
// as context (not as a threaded arg) keeps every render-path signature
// (renderRow / renderCell / grid / packing) untouched — this is instrumentation
// only, not a change to Matrix/swap logic.
// ---------------------------------------------------------------------------

export const MatrixPresetContext = createContext<string | undefined>(undefined);

export interface IMatrixSlotProps {
  /** Cell id — the slot name (e.g. `'main'`). */
  slot: string;
  children: JSX.Element;
}

/**
 * MatrixSlot — owner scope around one cell's content render that emits a
 * runtime trace on node `boost-layout.matrix.slot` (ADR 062).
 *
 * `mount` fires when the slot subtree is created; `dispose` (via `onCleanup`)
 * when it is torn down. `trace()` is a no-op — and allocates nothing — while
 * the trace toggle is off, so this stays in permanently.
 *
 * Why it exists: the canvas widget mounts twice in the studio composition
 * (bug A hunt). Counting `mount` for slot `main` shows whether Matrix itself
 * double-renders the slot content (двойной `mount` → корень здесь) or is clean
 * (один `mount` → копаем выше: Outlet/route).
 */
export const MatrixSlot = (props: IMatrixSlotProps): JSX.Element => {
  const preset = useContext(MatrixPresetContext);
  trace('boost-layout.matrix.slot', 'mount', { slot: props.slot, preset });
  onCleanup(() => trace('boost-layout.matrix.slot', 'dispose', { slot: props.slot }));
  return props.children;
};
