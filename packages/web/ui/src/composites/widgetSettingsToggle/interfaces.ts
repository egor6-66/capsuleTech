export interface IWidgetSettingsToggleProps {
  /** Extra CSS classes forwarded to the button element. */
  class?: string;
  /**
   * Called after toggle with the new settingsMode value.
   * Receives the mode that will be active AFTER the toggle.
   */
  onChange?: (enabled: boolean) => void;
}
