/**
 * Shell.Appearance — единый блок управления стилями для Shell.Header.Menu.
 *
 * Объединяет все стиле-контролы (dark-mode, finish-mode, finish-settings,
 * theme-picker, ambient-background) в один config-driven пункт меню.
 * Каждый контрол отключается отдельным boolean-пропом; все включены по умолчанию.
 *
 * Приложение вставляет только:
 *   ```tsx
 *   <Shell.Header.Menu>
 *     <Shell.Appearance />
 *   </Shell.Header.Menu>
 *   ```
 *
 * Раскладка внутри группы зеркалит исходный header.tsx:
 *   - dark/finish — inline-тоглы в Ui.Layout.Flex
 *   - finishSettings, theme, background — Dropdown.Sub пункты
 */

import { useFinishMode } from '@capsuletech/web-style';
import { Dropdown } from '@capsuletech/web-ui/dropdown';
import { Show } from 'solid-js';

import { FinishSettings } from '../finishSettings';
import { ModeToggle } from '../modeToggle';
import { ThemePicker } from '../themePicker';
import { BackgroundSettings } from './backgroundSettings';
import type { IAppearanceProps } from './interfaces';

/**
 * Thin layout wrapper that mirrors Shell.Header.Menu.Group's horizontal-flex
 * row — used to host inline toggles (dark / finish) that need px-2 py-1.5
 * padding inside the dropdown panel.
 */
function InlineRow(props: { children: import('solid-js').JSX.Element }) {
  return <div class="flex items-center px-2 py-1.5">{props.children}</div>;
}

// ---------------------------------------------------------------------------
// Shell.Appearance
// ---------------------------------------------------------------------------

/**
 * Config-driven appearance block. Drop it inside `<Shell.Header.Menu>` to get
 * the full style-controls group: dark / finish toggles, finish-settings sub,
 * theme picker sub, and ambient-background editor sub.
 *
 * All props default to `true`. Pass `false` to hide a specific sub-section.
 *
 * @example
 * ```tsx
 * // All controls (default):
 * <Shell.Header.Menu>
 *   <Shell.Appearance />
 *   <Shell.Header.Menu.Separator />
 *   …
 * </Shell.Header.Menu>
 *
 * // Without the background editor:
 * <Shell.Appearance background={false} />
 *
 * // Custom label:
 * <Shell.Appearance label="Внешний вид" />
 * ```
 */
export const Appearance = (props: IAppearanceProps) => {
  const label = () => props.label ?? 'Оформление';
  const showDark = () => props.darkMode !== false;
  const showFinish = () => props.finish !== false;
  const showFinishSettings = () => props.finishSettings !== false;
  const showTheme = () => props.theme !== false;
  const showBackground = () => props.background !== false;

  // Finish-mode signal: finish-settings and background are only meaningful
  // when finish mode is active. The toggle itself is always shown (how else
  // would the user turn it on?).
  const finishOn = useFinishMode();

  return (
    <Dropdown.Group>
      <Dropdown.Label>{label()}</Dropdown.Label>

      {/* 1. Dark mode toggle */}
      <Show when={showDark()}>
        <InlineRow>
          <ModeToggle mode="dark" />
        </InlineRow>
      </Show>

      {/* 2. Finish (объём) toggle — always visible when the prop is enabled */}
      <Show when={showFinish()}>
        <InlineRow>
          <ModeToggle mode="finish" />
        </InlineRow>
      </Show>

      {/* 3. Theme picker sub-menu — independent of finish mode */}
      <Show when={showTheme()}>
        <ThemePicker mode="sub" />
      </Show>

      {/* 4. Bottom pair: Объём-settings ▶ + Фон ▶ — only when finish mode is on */}
      <Show when={finishOn() && showFinishSettings()}>
        <FinishSettings mode="sub" />
      </Show>

      <Show when={finishOn() && showBackground()}>
        <BackgroundSettings />
      </Show>
    </Dropdown.Group>
  );
};
