/**
 * CanvasStyle — UI-блок canvas-local override'а темы и dark-mode.
 *
 * Сидит рядом с Inspector'ом и позволяет посмотреть выбранный компонент в
 * другой теме / dark-mode без касания глобального `@capsuletech/web-style`
 * switcher'а (тот рулит app-chrome'ом).
 *
 * Композиция:
 *  - `ThemePicker` из `@capsuletech/web-shell/ui` в state-injectable режиме
 *    (`value` + `onSelect` пропы декаплят его от глобального `useTheme/setTheme`).
 *  - `ModeToggle` из `@capsuletech/web-shell/ui` с КАСТОМНЫМ `IModeDescriptor`
 *    — `active`/`toggle` указывают на canvas-local signal'ы. `mode="dark"`
 *    built-in указывал бы на глобал — не подходит.
 *  - Reset кнопка — `resetCanvasStyle()` зануляет оба override'а.
 *
 * **Dark default**: `useCanvasDark()` возвращает `null` пока юзер не тронул
 * toggle. ModeToggle ждёт `Accessor<boolean>`, поэтому adapt'им через
 * `() => canvasDark() ?? false` — UI показывает "выключено" в inherit-режиме,
 * первый клик пишет `true` (overide включён). Это семантически корректно:
 * "toggle сейчас off" с точки зрения canvas'а до первого касания.
 *
 * **Видимость reset**: `<Show when={active()}>` — кнопка появляется только
 * когда хотя бы одна ось overrid'ится, иначе зашумляет UI бесполезной операцией.
 */

import { ModeToggle, ThemePicker } from '@capsuletech/web-shell/ui';
import { useDarkMode } from '@capsuletech/web-style';
import { Accordion } from '@capsuletech/web-ui/accordion';
import { Flex } from '@capsuletech/web-ui/flex';
import { Moon } from '@capsuletech/web-ui/icons';
import {
  setCanvasDark,
  setCanvasTheme,
  useCanvasDark,
  useCanvasStyleActive,
  useCanvasTheme,
} from './state';

export const CanvasStyle = () => {
  const canvasTheme = useCanvasTheme();
  const canvasDark = useCanvasDark();
  const parentDark = useDarkMode();
  const active = useCanvasStyleActive();

  // ThemePicker.value требует Accessor<string>; null означает inherit, в UI
  // показываем пустую строку (placeholder в dropdown'е сам отрисует state).
  // Текущая ThemePicker-имплементация подсвечивает чек только при ровном
  // равенстве с item.value — для '' ни один item не подсветится, что для
  // inherit-режима корректно.
  const themeAccessor = () => canvasTheme() ?? '';

  // Effective dark = override ?? parent (CanvasFrame инхеритит глобал когда
  // override === null). Тогл должен отражать ВИДИМОЕ состояние, иначе при
  // inherit'е dark=true он бы показывал "off" и первый клик писал true (что и
  // так было) — визуально ничего, второй клик флипал бы наконец на light.
  const effectiveDark = () => canvasDark() ?? parentDark();

  const darkDescriptor = {
    active: effectiveDark,
    toggle: () => setCanvasDark(!effectiveDark()),
    label: 'Dark canvas',
    icon: Moon,
  };

  return (
    <Flex wrap="wrap" w={'full'}>
      <Accordion defaultValue={['canvas-style']} fluid={300} multiple>
        <Accordion.Item value="canvas-style">
          <Accordion.Trigger>Canvas style</Accordion.Trigger>
          <Accordion.Content>
            <Flex orientation="vertical" gap={3} class="px-1 py-2">
              <Flex orientation="horizontal" gap={2} align="center" class="flex-wrap">
                <ThemePicker
                  value={themeAccessor}
                  onSelect={setCanvasTheme}
                  triggerLabel={
                    <>
                      <span class="text-muted-foreground">Theme:</span>
                      <span>{canvasTheme() ?? 'inherit'}</span>
                    </>
                  }
                />
                <ModeToggle mode={darkDescriptor} size="sm" />
              </Flex>
            </Flex>
          </Accordion.Content>
        </Accordion.Item>
      </Accordion>
    </Flex>
  );
};
