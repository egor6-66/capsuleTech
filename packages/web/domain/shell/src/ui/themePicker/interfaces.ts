import type { Accessor, JSX } from 'solid-js';

export interface IThemePickerProps {
  /**
   * Override the available theme list.
   * Defaults to `DISCOVERED_THEMES` from `@capsuletech/web-style`.
   */
  themes?: readonly string[];
  /** Optional DOM target for applying the theme (defaults to documentElement). */
  target?: HTMLElement;
  /** Called after a theme is selected with the new theme name. */
  onChange?: (theme: string) => void;
  /**
   * Override the current theme accessor. When provided, the active-theme
   * checkmark and any read of "what is selected now" reads from `value()`
   * instead of the global `useTheme()` from `@capsuletech/web-style`.
   *
   * Pair with `onSelect` for fully state-injectable usage (e.g. canvas-local
   * theme override in studio). When omitted, defaults to global `useTheme()`.
   */
  value?: Accessor<string>;
  /**
   * Override the set-theme action. When provided, selecting an item calls
   * `onSelect(name)` instead of the global `setTheme(name, target)` from
   * `@capsuletech/web-style`. `target` and `onChange` are still honored
   * (onChange after onSelect for parity with global flow).
   *
   * Pair with `value` for fully state-injectable usage. When omitted, defaults
   * to global `setTheme`.
   */
  onSelect?: (name: string) => void;
  /** Custom label for the trigger. Defaults to "Theme: <current>". */
  triggerLabel?: string | JSX.Element;
  /** Extra classes forwarded to the trigger. */
  class?: string;
  /**
   * Render mode.
   *  - `'standalone'` (default) — own `<Dropdown>` root.
   *  - `'sub'` — `<Dropdown.Sub>`, nests inside a parent `<Dropdown.Content>`.
   */
  mode?: 'standalone' | 'sub';
}
