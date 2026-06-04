/**
 * Switcher state-stores и helpers. Visual widget'ы (DarkModeToggle / ThemePicker /
 * LayoutModeToggle) живут в `@capsuletech/web-ui/composites` — web-style не
 * зависит от web-ui (иначе cycle), поэтому видимые компоненты переехали туда.
 *
 * Web-style оставляет только:
 *  - Reactive signal stores (`useTheme` / `useDarkMode` / `useLayoutMode`).
 *  - Setters / togglers + DOM-apply helpers.
 *  - `DISCOVERED_THEMES` (eager-glob по themes/).
 */

export {
  type LayoutMode,
  setLayoutMode,
  toggleLayoutMode,
  useLayoutMode,
} from './layoutMode';
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
