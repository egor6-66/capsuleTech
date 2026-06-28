import { cn } from '@capsuletech/web-style';
import { Slider as KobalteSlider } from '@kobalte/core/slider';
import { Show, splitProps } from 'solid-js';

import { useTrace } from '../../internal/useTrace';
import type { ISliderProps } from './interfaces';
import {
  sliderFillCva,
  sliderLabelRowCva,
  sliderRootCva,
  sliderThumbCva,
  sliderTrackCva,
  sliderValueCva,
} from './variants';

/**
 * Slider — a horizontal range control built on `@kobalte/core/slider`.
 *
 * Supports both controlled and uncontrolled modes:
 * - **Controlled**: `value` + `onChange`.
 * - **Uncontrolled**: `defaultValue` (state held internally by Kobalte).
 *
 * Default range is `0–1` with `step=0.01`, which is the primary use-case for
 * alpha/opacity sliders in the finish-mode settings panel.
 *
 * All colours come from theme tokens (`bg-primary`, `bg-secondary`,
 * `bg-background`, `border-primary`, `ring-ring`) — consistent with Toggle,
 * Input, and Select across light/dark themes.
 *
 * @example
 * ```tsx
 * // Controlled alpha slider
 * const [alpha, setAlpha] = createSignal(0.5);
 * <Slider value={alpha()} onChange={setAlpha} label="Alpha" showValue />
 *
 * // Uncontrolled 0-100 percentage
 * <Slider min={0} max={100} step={1} defaultValue={50} label="Volume" showValue />
 * ```
 */
export const Slider = (props: ISliderProps) => {
  useTrace('web-ui.slider'); // ADR 062
  const [local, others] = splitProps(props, [
    'value',
    'defaultValue',
    'onChange',
    'onChangeEnd',
    'min',
    'max',
    'step',
    'label',
    'showValue',
    'class',
    'style',
    'disabled',
  ]);

  const minVal = () => local.min ?? 0;
  const maxVal = () => local.max ?? 1;
  const stepVal = () => local.step ?? 0.01;

  // Kobalte Slider works with number[], so we wrap/unwrap single values.
  const kobalteValue = () => (local.value !== undefined ? [local.value] : undefined);

  const kobalteDefault = () =>
    local.defaultValue !== undefined ? [local.defaultValue] : [minVal()];

  const handleChange = (vals: number[]) => {
    local.onChange?.(vals[0] ?? minVal());
  };

  const handleChangeEnd = (vals: number[]) => {
    local.onChangeEnd?.(vals[0] ?? minVal());
  };

  return (
    <KobalteSlider
      class={cn(sliderRootCva(), local.class)}
      style={local.style}
      value={kobalteValue()}
      defaultValue={kobalteDefault()}
      onChange={handleChange}
      onChangeEnd={handleChangeEnd}
      minValue={minVal()}
      maxValue={maxVal()}
      step={stepVal()}
      disabled={local.disabled}
      {...(others as object)}
    >
      <Show when={local.label}>
        <div class={sliderLabelRowCva()}>
          <KobalteSlider.Label class="text-sm text-foreground">{local.label}</KobalteSlider.Label>
          <Show when={local.showValue}>
            <KobalteSlider.ValueLabel class={sliderValueCva()} />
          </Show>
        </div>
      </Show>

      {/* Wrapper keeps Track and Thumb in the same relative stacking context
          so Kobalte's absolute-positioned thumb aligns with the track line. */}
      <div class="relative flex w-full items-center py-2">
        <KobalteSlider.Track class={sliderTrackCva()}>
          <KobalteSlider.Fill class={sliderFillCva()} />
        </KobalteSlider.Track>

        <KobalteSlider.Thumb class={sliderThumbCva()}>
          <KobalteSlider.Input />
        </KobalteSlider.Thumb>
      </div>
    </KobalteSlider>
  );
};
