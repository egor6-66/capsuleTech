import type {
  AccordionContentProps,
  AccordionItemProps,
  AccordionRootProps,
  AccordionTriggerProps,
} from '@kobalte/core/accordion';
import type { JSX } from 'solid-js';

/**
 * Density of the trigger rows. `compact` tightens vertical padding for
 * dense list-like usage (e.g. a component palette); `default` keeps the
 * comfortable `px-4 py-3`.
 */
export type AccordionDensity = 'default' | 'compact';

/**
 * Named look-preset. A preset is a frozen bundle of root props (bordered /
 * multiple / density) that reproduces a canonical appearance in one word.
 * Explicit props always win over the preset's values.
 *
 * - `segmented` — the studio component-palette look: `bordered` outer stroke,
 *   `multiple`-open behaviour, `compact` density. Nesting indent is opt-in via
 *   the separate `nested` prop.
 */
export type AccordionPreset = 'segmented';

/**
 * Root accordion container.
 *
 * Kobalte Accordion supports both single and multiple-open modes:
 * - `multiple` — allow multiple items to be expanded simultaneously.
 * - `collapsible` — in single mode, allow clicking the open trigger to collapse it.
 *
 * `value` / `defaultValue` / `onChange` always use `string[]` (Kobalte contract),
 * even when `multiple` is false (a single open item is represented as a one-element array).
 */
export interface IAccordionProps extends AccordionRootProps {
  /** Extra CSS classes on the root element. */
  class?: string;
  children?: JSX.Element;
  /**
   * Canonical responsive pattern (mirrors Flex's `fluid`). Applies
   * `flex: 1 1 Npx` inline: grows to fill parent's main-axis, shrinks
   * when needed, basis = N (px). Combined with parent `<Flex wrap='wrap'>`,
   * wraps to new row when container ≤ 2×N.
   *
   * When set, `w-full` is dropped to avoid conflict with the `flex` shorthand.
   *
   * For typical (non-responsive) usage, omit — Accordion stays `w-full`.
   */
  fluid?: number;
  /**
   * Opt-in outer stroke (`border`). Keeps adjacent accordions visually
   * distinct instead of merging into one flat surface. Off by default.
   * Independent of `rounded`.
   */
  bordered?: boolean;
  /**
   * Opt-in rounded corners (`rounded-md`, with `overflow-hidden` so item
   * corners clip to the radius). Off by default. Independent of `bordered`.
   */
  rounded?: boolean;
  /**
   * Named look-preset (see {@link AccordionPreset}). Applies a frozen bundle
   * of root props in one word. Explicit props override the preset's values,
   * so `<Accordion preset="segmented" density="default">` keeps the segmented
   * stroke + multiple-mode but restores the roomy trigger padding.
   */
  preset?: AccordionPreset;
  /**
   * Trigger row density. Flows to every `Accordion.Trigger` via context, so
   * the consumer never hand-tightens padding with a raw class. Default
   * `'default'` (`px-4 py-3`); `'compact'` → `px-4 py-2`.
   */
  density?: AccordionDensity;
  /**
   * Indent this accordion as a nested level (`pl-3`). Replaces the raw
   * `class="pl-3"` a consumer would otherwise add to a sub-accordion — the
   * indent of a nested level is the component's concern, not the caller's.
   */
  nested?: boolean;
}

/**
 * A collapsible section of the accordion.
 * `value` must be unique within the accordion.
 */
export interface IAccordionItemProps extends AccordionItemProps {
  /** Unique identifier for this item. */
  value: string;
  /** Whether this item is disabled. */
  disabled?: boolean;
  /** Extra CSS classes on the item element. */
  class?: string;
  children?: JSX.Element;
}

/**
 * Clickable header that opens/closes the item.
 * Renders a button with label on the left and a rotating chevron on the right.
 */
export interface IAccordionTriggerProps extends AccordionTriggerProps {
  /** Extra CSS classes on the trigger element. */
  class?: string;
  /** Trigger label. */
  children?: JSX.Element;
  /**
   * Optional muted caption under the label. When set, the label is drawn as a
   * column stack (title on top, muted subtitle below); otherwise — a single
   * line. Replaces the raw `flex-col` + `tone="muted"` composite a consumer
   * would otherwise hand-roll around the trigger's children.
   */
  subtitle?: JSX.Element;
}

/**
 * Collapsible content panel for an accordion item.
 * Kobalte sets `--kb-accordion-content-height` on this element — used for
 * smooth height transition animations via the `grid` template trick.
 */
export interface IAccordionContentProps extends AccordionContentProps {
  /** Extra CSS classes on the content element. */
  class?: string;
  children?: JSX.Element;
}
