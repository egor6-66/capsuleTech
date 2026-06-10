import type {
  SelectContentProps,
  SelectPortalProps,
  SelectRootProps,
  SelectTriggerProps,
} from '@kobalte/core/select';
import type { JSX } from 'solid-js';

/**
 * A single option inside the Select.
 */
export interface ISelectOption {
  /** The value submitted / matched by controlled `value`. */
  value: string;
  /** Human-readable label rendered in trigger and items. */
  label: string;
  /** When `true` the item is visible but non-interactive. */
  disabled?: boolean;
}

/**
 * Root Select container.
 *
 * **Convenience (primary API):** pass `options` array + `placeholder`:
 * ```tsx
 * <Select
 *   options={[{ value: 'a', label: 'Option A' }, { value: 'b', label: 'Option B' }]}
 *   value={selected()}
 *   onChange={setSelected}
 *   placeholder="Choose…"
 * />
 * ```
 *
 * **Compound (custom trigger layout):** supply `options` on root + render
 * `Select.Trigger` / `Select.Content` as children:
 * ```tsx
 * <Select options={opts} value={v()} onChange={setV} placeholder="Choose…">
 *   <Select.Trigger><Select.Value /></Select.Trigger>
 *   <Select.Content />
 * </Select>
 * ```
 */
export interface ISelectProps
  extends Omit<SelectRootProps<string>, 'options' | 'itemComponent' | 'placeholder'> {
  /**
   * Array of options to display. The component renders them automatically.
   */
  options?: ISelectOption[];
  /** Placeholder text shown in trigger when no value is selected. */
  placeholder?: JSX.Element;
  /** Extra CSS classes forwarded to the root element. */
  class?: string;
  /** Select children — trigger + content in compound mode. */
  children?: JSX.Element;
}

/**
 * The button that opens / closes the select popover.
 * Renders as a `<button>` with `aria-haspopup="listbox"`.
 */
export interface ISelectTriggerProps extends SelectTriggerProps {
  /** Extra CSS classes merged with default trigger styles. */
  class?: string;
  /** Trigger label or children (usually `<Select.Value>`). */
  children?: JSX.Element;
}

/**
 * The panel that contains the list of items.
 * Rendered inside a Portal; Kobalte handles positioning via Floating UI.
 */
export interface ISelectContentProps extends SelectContentProps {
  /** Extra CSS classes merged with default panel styles. */
  class?: string;
  /** Props forwarded to the Portal wrapper (e.g. custom `mount` target). */
  portalProps?: SelectPortalProps;
}

/**
 * Displays the current value in the trigger.
 * Placeholder is controlled by `placeholder` prop on the root `<Select>`.
 */
export interface ISelectValueProps {
  /** Extra CSS classes. */
  class?: string;
}
