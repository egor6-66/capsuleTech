import type { Accessor, Component } from 'solid-js';

/**
 * A switchable boolean "mode" — what the {@link ModeToggle} renders.
 *
 * Each descriptor binds a reactive on/off signal to a flip action plus its
 * presentation (label + icon). Built-in descriptors live in `modes.ts` and are
 * wired to the `@capsuletech/web-style` switcher store; consumers may also pass
 * a custom descriptor inline.
 */
export interface IModeDescriptor {
  /** Reactive accessor — is the mode currently on. */
  active: Accessor<boolean>;
  /** Flip the mode (read post-toggle value from `active()` afterwards). */
  toggle: () => void;
  /** Text label shown next to the switch. */
  label: string;
  /** Optional leading icon (a `lucide-solid` component via `@capsuletech/web-ui/icons`). */
  icon?: Component<{ class?: string; 'aria-hidden'?: boolean | 'true' | 'false' }>;
}

/** Built-in mode keys bound to the web-style switcher store. */
export type BuiltinMode = 'dark' | 'dnd' | 'resize' | 'settings' | 'finish';

export interface IModeToggleProps {
  /** A built-in mode key (`'dark' | 'dnd' | 'resize' | 'settings' | 'finish'`) or a custom descriptor. */
  mode: BuiltinMode | IModeDescriptor;
  /** Override the descriptor's default label. */
  label?: string;
  /** Switch size — forwarded to the underlying `Ui.Toggle`. */
  size?: 'sm' | 'md' | 'lg';
  /** Extra classes on the row wrapper. */
  class?: string;
  /** Called after the mode flips, with the post-toggle value. */
  onChange?: (next: boolean) => void;
}
