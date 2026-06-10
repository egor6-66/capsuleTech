/**
 * Props for the Appearance connected block.
 *
 * Every feature sub-section is guarded by a boolean prop that defaults to
 * `true`, so apps get all controls by default and can opt-out individually.
 */
export interface IAppearanceProps {
  /**
   * Label shown at the top of the appearance group inside Shell.Header.Menu.
   * @default "Оформление"
   */
  label?: string;

  /**
   * Show the dark-mode toggle.
   * @default true
   */
  darkMode?: boolean;

  /**
   * Show the finish-mode toggle.
   * @default true
   */
  finish?: boolean;

  /**
   * Show the finish-settings sub-menu.
   * @default true
   */
  finishSettings?: boolean;

  /**
   * Show the theme picker sub-menu.
   * @default true
   */
  theme?: boolean;

  /**
   * Show the ambient-background editor sub-menu.
   * @default true
   */
  background?: boolean;
}
