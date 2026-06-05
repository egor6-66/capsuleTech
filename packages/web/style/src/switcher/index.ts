/**
 * Switcher state-stores и helpers. Visual widget'ы (ModeToggle / ThemePicker)
 * живут в `@capsuletech/web-shell` (tier-2, ADR 032) и потребляют эти сигналы —
 * web-style не зависит от web-ui/web-shell (иначе cycle), поэтому видимые
 * компоненты переехали туда.
 *
 * Web-style оставляет только:
 *  - Reactive signal stores (`useTheme` / `useDarkMode` / `useResizeMode` / `useDndMode`).
 *  - Setters / togglers + DOM-apply helpers.
 *  - `DISCOVERED_THEMES` (eager-glob по themes/).
 */

export {
  setDndMode,
  toggleDndMode,
  useDndMode,
} from './dndMode';
export {
  setResizeMode,
  toggleResizeMode,
  useResizeMode,
} from './resizeMode';
export {
  setSettingsMode,
  toggleSettingsMode,
  useSettingsMode,
} from './settingsMode';
export {
  DISCOVERED_THEMES,
  setDarkMode,
  setTheme,
  toggleDarkMode,
  useDarkMode,
  useTheme,
} from './theme';
