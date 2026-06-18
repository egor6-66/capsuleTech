/**
 * Canvas-style — canvas-local override'ы темы/dark-mode для preview-области
 * студио. Параллельная ось рядом с глобальным `@capsuletech/web-style`
 * switcher'ом (тот рулит app-chrome'ом, этот — только canvas iframe).
 *
 * Public API:
 *  - `CanvasStyle` — UI-блок (используется в `WebStudio.CanvasStyle` контроллере).
 *  - `useCanvasTheme` / `useCanvasDark` — accessors override-значений (null = inherit).
 *  - `setCanvasTheme` / `setCanvasDark` / `resetCanvasStyle` — setters.
 *
 * Связка с iframe DOM — в `canvas-frame/CanvasFrame.tsx` (override props) +
 * `controllers/WebStudioCanvas.tsx` (читает signal'ы, форвардит во frame).
 */

export { CanvasStyle } from './CanvasStyle';
export {
  resetCanvasStyle,
  setCanvasDark,
  setCanvasTheme,
  useCanvasDark,
  useCanvasStyleActive,
  useCanvasTheme,
} from './state';
