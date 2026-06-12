import type {
  AccordionContentProps,
  AccordionItemProps,
  AccordionRootProps,
  AccordionTriggerProps,
} from '@kobalte/core/accordion';
import type { JSX } from 'solid-js';

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
