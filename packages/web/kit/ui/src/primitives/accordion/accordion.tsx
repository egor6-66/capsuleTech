import { cn } from '@capsuletech/web-style';
import { Accordion as KobalteAccordion } from '@kobalte/core/accordion';
import { ChevronDown } from 'lucide-solid';
import { splitProps } from 'solid-js';

import { useTrace } from '../../internal/useTrace';
import type {
  IAccordionContentProps,
  IAccordionItemProps,
  IAccordionProps,
  IAccordionTriggerProps,
} from './interfaces';
import {
  accordionBorderClass,
  accordionContentCva,
  accordionContentInnerClass,
  accordionItemCva,
  accordionRootCva,
  accordionTriggerCva,
} from './variants';

/**
 * Root accordion container.
 *
 * @example
 * ```tsx
 * // Multiple sections open simultaneously (default for list use-cases):
 * <Accordion multiple>
 *   <Accordion.Item value="a">
 *     <Accordion.Trigger>Section A</Accordion.Trigger>
 *     <Accordion.Content>Content of A</Accordion.Content>
 *   </Accordion.Item>
 *   <Accordion.Item value="b">
 *     <Accordion.Trigger>Section B</Accordion.Trigger>
 *     <Accordion.Content>Content of B</Accordion.Content>
 *   </Accordion.Item>
 * </Accordion>
 *
 * // Single open, collapsible:
 * <Accordion collapsible>
 *   <Accordion.Item value="faq1">
 *     <Accordion.Trigger>What is Capsule?</Accordion.Trigger>
 *     <Accordion.Content>A framework for HCA-style apps.</Accordion.Content>
 *   </Accordion.Item>
 * </Accordion>
 * ```
 */
const AccordionImpl = (props: IAccordionProps) => {
  useTrace('web-ui.accordion'); // ADR 062
  const [local, others] = splitProps(props, ['class', 'fluid', 'bordered']);

  const rootClass = () =>
    local.fluid !== undefined
      ? // Drop `w-full` when fluid is set — it conflicts with `flex: 1 1 Npx`.
        cn('divide-y divide-border', local.bordered && accordionBorderClass, local.class)
      : cn(accordionRootCva({ bordered: local.bordered }), local.class);

  const rootStyle = (): string | undefined =>
    local.fluid !== undefined ? `flex: 1 1 ${local.fluid}px` : undefined;

  return <KobalteAccordion class={rootClass()} style={rootStyle()} {...(others as any)} />;
};

/**
 * A single collapsible section. Must have a unique `value` prop within its
 * parent accordion.
 */
const Item = (props: IAccordionItemProps) => {
  const [local, others] = splitProps(props, ['class']);
  return <KobalteAccordion.Item class={cn(accordionItemCva(), local.class)} {...(others as any)} />;
};

/**
 * Header row that opens/closes the item.
 * Contains a label on the left and a ChevronDown icon on the right that
 * rotates 180° when the parent Item is expanded.
 *
 * The `group` class on the trigger + `group-aria-expanded:rotate-180` on
 * the chevron detects the open state via `aria-expanded` on the button.
 * Kobalte sets `data-[expanded]` on BOTH the Item (CollapsibleRoot) AND
 * the Trigger button (via CollapsibleTrigger → context.dataset()); the CVA
 * supplies an explicit `data-[expanded]` style to prevent browser-native
 * accent fills on `button[data-expanded]`.
 */
const Trigger = (props: IAccordionTriggerProps) => {
  const [local, others] = splitProps(props, ['class', 'children']);
  return (
    <KobalteAccordion.Header>
      <KobalteAccordion.Trigger class={cn(accordionTriggerCva(), local.class)} {...(others as any)}>
        <span>{local.children}</span>
        <ChevronDown
          size={16}
          aria-hidden="true"
          class="shrink-0 text-muted-foreground transition-transform duration-300 group-aria-expanded:rotate-180"
        />
      </KobalteAccordion.Trigger>
    </KobalteAccordion.Header>
  );
};

/**
 * Animated content panel.
 *
 * Uses keyframe animation via `.accordion-animate` (from `@capsuletech/web-style`).
 * Kobalte waits for `animationend` before unmounting, so the collapse animation
 * completes before the element is removed — unlike CSS transitions which fire
 * after unmount. Pattern mirrors `popover-animate` in Dropdown.Content.
 */
const Content = (props: IAccordionContentProps) => {
  const [local, others] = splitProps(props, ['class', 'children']);
  return (
    <KobalteAccordion.Content class={cn(accordionContentCva(), local.class)} {...(others as any)}>
      {/* Inner wrapper ensures min-h:0 so grid can fully collapse */}
      <div class={accordionContentInnerClass}>{local.children}</div>
    </KobalteAccordion.Content>
  );
};

/**
 * Accessible accordion primitive built on `@kobalte/core/accordion`.
 *
 * Features:
 * - Independent expand/collapse per item (no shared state between sections).
 * - `multiple` mode: multiple items open simultaneously.
 * - `collapsible` mode: in single mode, active item can be closed by clicking again.
 * - Keyframe height animation via `.accordion-animate` — no JS, no motionone needed.
 * - Chevron indicator rotates on `[data-expanded]`.
 * - Keyboard navigation (arrow keys, Home, End, Enter/Space).
 * - Full a11y: `role="region"`, `aria-labelledby` linking trigger ↔ panel.
 */
export const Accordion = Object.assign(AccordionImpl, {
  Item,
  Trigger,
  Content,
});

// Named re-exports for web-core createLazy pattern.
export { Content as AccordionContent, Item as AccordionItem, Trigger as AccordionTrigger };
