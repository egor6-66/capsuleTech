/**
 * Props for the FinishSettings connected control.
 */
export interface IFinishSettingsProps {
  /**
   * Render mode.
   *  - `'standalone'` (default) — own `<Dropdown>` root.
   *  - `'sub'` — `<Dropdown.Sub>`, nests inside a parent `<Dropdown.Content>`.
   */
  mode?: 'standalone' | 'sub';
  /** Custom label for the trigger / sub-trigger. Defaults to "Finish ▶". */
  triggerLabel?: string;
  /** Extra CSS classes forwarded to the trigger element. */
  class?: string;
}
