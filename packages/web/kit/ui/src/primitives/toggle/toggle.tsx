import { cn } from '@capsuletech/web-style';
import { createSignal, createUniqueId, Show } from 'solid-js';
import type { IToggleProps } from './interfaces';
import { toggleLabelCva, toggleThumbCva, toggleTrackCva } from './variants';

/**
 * Toggle — switch-style контрол. `role=switch` для accessibility,
 * `data-checked` атрибут для стилизации через CSS-селекторы (см. variants).
 *
 * Поддерживает оба режима:
 * - controlled — `checked` + `onChange`;
 * - uncontrolled — `defaultChecked`, состояние держится внутри.
 *
 * Все цвета — только из темовых токенов (`bg-primary` / `bg-muted` /
 * `bg-background` / `border-border`). При переключении темы поведение
 * визуально остаётся консистентным.
 */
export const Toggle = (props: IToggleProps) => {
  const id = createUniqueId();
  const [internal, setInternal] = createSignal(!!props.defaultChecked);
  const isControlled = () => props.checked !== undefined;
  const checked = () => (isControlled() ? !!props.checked : internal());
  const size = () => props.size ?? 'md';

  const toggle = () => {
    if (props.disabled) return;
    const next = !checked();
    if (!isControlled()) setInternal(next);
    props.onChange?.(next);
  };

  return (
    <div class="inline-flex items-center gap-2">
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked()}
        disabled={props.disabled}
        data-checked={checked() ? '' : undefined}
        onClick={toggle}
        class={cn(toggleTrackCva({ size: size() }), props.class)}
      >
        <span class={toggleThumbCva({ size: size() })} />
      </button>
      <Show when={props.label}>
        <label for={id} class={toggleLabelCva({ size: size() })}>
          {props.label}
        </label>
      </Show>
    </div>
  );
};
