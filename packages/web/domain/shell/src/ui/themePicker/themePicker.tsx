import { DISCOVERED_THEMES, setTheme, useTheme } from '@capsuletech/web-style';
import { Palette } from '@capsuletech/web-ui/icons';
import { splitProps } from 'solid-js';

import { Picker } from '../picker';
import type { IThemePickerProps } from './interfaces';

/**
 * Dropdown-based theme picker — тонкий wrapper над generic `Shell.Picker`:
 * каркас селекта живёт в `../picker`, здесь только тематические дефолты
 * (DISCOVERED_THEMES / useTheme / setTheme / Palette-иконка / label 'Тема').
 *
 * A connected control — by default, theme state lives in the
 * `@capsuletech/web-style` module-level signal. Can be made fully
 * state-injectable via the `value` + `onSelect` props, which bypass the global
 * signal entirely (useful for canvas-local theme overrides in studio).
 *
 * @example
 * ```tsx
 * // Standalone — own dropdown root (default):
 * <ThemePicker />
 *
 * // Sub mode — inside a parent Dropdown.Content:
 * <Dropdown>
 *   <Dropdown.Trigger>Menu</Dropdown.Trigger>
 *   <Dropdown.Content>
 *     <ThemePicker mode="sub" />
 *   </Dropdown.Content>
 * </Dropdown>
 *
 * // Canvas-local override (state-injectable):
 * const [canvasTheme, setCanvasTheme] = createSignal('default');
 * <ThemePicker value={canvasTheme} onSelect={setCanvasTheme} />
 * ```
 */
export const ThemePicker = (props: IThemePickerProps) => {
  const [local] = splitProps(props, [
    'themes',
    'target',
    'onChange',
    'onSelect',
    'value',
    'triggerLabel',
    'class',
    'mode',
  ]);
  const globalTheme = useTheme();
  const current = () => local.value?.() ?? globalTheme();
  const mode = () => local.mode ?? 'standalone';

  const handleSelect = (name: string) => {
    if (local.onSelect) {
      local.onSelect(name);
    } else {
      setTheme(name, local.target);
    }
  };

  // Дефолтные лейблы триггера — 1:1 с historic-поведением ThemePicker:
  // standalone → "Theme: <current>", sub → 'Тема'. Иконка Palette — только в
  // sub (в standalone исторически иконки не было).
  const triggerLabel = () =>
    local.triggerLabel ??
    (mode() === 'sub' ? (
      'Тема'
    ) : (
      <>
        <span class="text-muted-foreground">Theme:</span>
        <span>{current()}</span>
      </>
    ));

  return (
    <Picker
      name="theme"
      options={local.themes ?? DISCOVERED_THEMES}
      value={current}
      onSelect={handleSelect}
      onChange={local.onChange}
      triggerLabel={triggerLabel()}
      icon={mode() === 'sub' ? Palette : undefined}
      class={local.class}
      mode={local.mode}
    />
  );
};
