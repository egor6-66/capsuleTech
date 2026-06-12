import { cn } from '@capsuletech/web-style';
import { Toggle } from '@capsuletech/web-ui/toggle';
import { Show } from 'solid-js';
import { Dynamic } from 'solid-js/web';

import type { IModeDescriptor, IModeToggleProps } from './interfaces';
import { MODES } from './modes';

/**
 * One declarative switch for any boolean app-mode (dark / dnd / resize / widget
 * settings, or a custom descriptor). Replaces the four near-identical
 * `*ModeToggle` components that used to live in `@capsuletech/web-ui/composites`.
 *
 * State lives in the `@capsuletech/web-style` switcher store — this is a
 * connected control, not a stateless primitive, which is why it lives in
 * web-shell rather than the UI-kit.
 *
 * @example
 * ```tsx
 * <ModeToggle mode="dark" />
 * <ModeToggle mode="settings" size="sm" />
 * <ModeToggle mode={{ active: mySignal, toggle: flip, label: 'Grid', icon: Grid }} />
 * ```
 */
export const ModeToggle = (props: IModeToggleProps) => {
  const descriptor = (): IModeDescriptor =>
    typeof props.mode === 'string' ? MODES[props.mode] : props.mode;

  return (
    <div class={cn('inline-flex items-center gap-2', props.class)}>
      <Show when={descriptor().icon}>
        {(Icon) => (
          <Dynamic
            component={Icon()}
            class="size-4 shrink-0 text-muted-foreground"
            aria-hidden="true"
          />
        )}
      </Show>
      <Toggle
        size={props.size ?? 'md'}
        label={props.label ?? descriptor().label}
        checked={descriptor().active()}
        onChange={(next) => {
          descriptor().toggle();
          props.onChange?.(next);
        }}
      />
    </div>
  );
};
