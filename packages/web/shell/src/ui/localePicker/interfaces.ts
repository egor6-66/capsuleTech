import type { JSX } from 'solid-js';

export interface ILocalePickerProps {
  /**
   * Override the available locale list.
   * Defaults to `useLocales()` from `@capsuletech/web-intl`.
   */
  locales?: readonly string[];
  /**
   * Display name map: locale tag → human-readable label.
   * If a locale is absent from the map, the tag itself is shown.
   * @example { en: 'English', ru: 'Русский' }
   */
  labels?: Record<string, string>;
  /** Called after a locale is selected with the new locale tag. */
  onChange?: (locale: string) => void;
  /** Custom label for the trigger. Defaults to "Язык: <labels[current] ?? current>". */
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
