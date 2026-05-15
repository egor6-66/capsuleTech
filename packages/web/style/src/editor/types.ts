export type ThemeMode = 'light' | 'dark';

/**
 * Один прокручиваемый «дизайн» — то, что меняется в редакторе. Покрывает
 * shadcn-набор токенов + наши `spacing-base`/`text-base-size`.
 *
 * Намеренно flat: проще apply'ить в `style.setProperty` без обхода вложений.
 */
export interface ITheme {
  mode: ThemeMode;
  /** Primary акцент. OKLCH-строка вида `'oklch(0.65 0.18 250)'`. */
  primary: string;
  /** Border-radius в rem. Применяется к `--radius`; sm/md/lg деривированы. */
  radius: number;
  /** Базовый отступ в rem. `--spacing-base`. */
  spacingBase: number;
  /** Базовый размер шрифта в rem. `--text-base-size`. */
  fontBaseSize: number;
  /** font-family. Применяется к scope-элементу. */
  fontFamily: string;
}

export interface IPresetColor {
  id: string;
  label: string;
  /** OKLCH primary для обоих режимов. shadcn держит одинаковый — мы тоже. */
  primary: string;
}

export interface IFontOption {
  id: string;
  label: string;
  stack: string;
}
