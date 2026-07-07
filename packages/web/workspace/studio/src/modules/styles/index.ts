/**
 * Styles-модуль студио: canvas-local theme/dark override.
 *
 * - `useCanvasTheme` / `ICanvasThemeState` — общий singleton (как `selection`).
 * - `StylesPanel` — connected-панель, регистрируется как `WebStudio.Styles`
 *   через `../capsule` (ADR 033), а не импортится напрямую.
 */

export {
  type ICanvasThemeState,
  type IWebStudioCanvasTheme,
  useCanvasTheme,
} from './canvas-theme';
export { StylesPanel } from './StylesPanel';
