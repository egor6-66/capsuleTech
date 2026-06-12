import type { JSX } from 'solid-js';

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
