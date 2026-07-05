import { cn } from '@capsuletech/web-style';
import { Accordion as KobalteAccordion } from '@kobalte/core/accordion';
import { ChevronDown } from 'lucide-solid';
import { type Accessor, createContext, splitProps, useContext } from 'solid-js';

import { useTrace } from '../../internal/useTrace';
import type {
  AccordionDensity,
  IAccordionContentProps,
  IAccordionItemProps,
  IAccordionProps,
  IAccordionTriggerProps,
} from './interfaces';
import { resolveAccordionPreset } from './presets';
import {
  accordionBorderClass,
  accordionContentCva,
  accordionContentInnerClass,
  accordionItemCva,
  accordionNestedClass,
  accordionRootCva,
  accordionRoundedClass,
  accordionTriggerCva,
} from './variants';

/**
 * Density flows Root → Trigger via context (Kobalte owns no slot for this),
 * so a consumer sets `density` once on the root and every trigger tightens.
 * Default accessor returns `'default'` — a standalone `Accordion.Trigger`
 * (outside a Root) still renders with roomy padding, never crashes.
 */
const AccordionDensityContext = createContext<Accessor<AccordionDensity>>(
  (): AccordionDensity => 'default',
);

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
  const [local, others] = splitProps(props, [
    'class',
    'fluid',
    'bordered',
    'rounded',
    'preset',
    'density',
    'nested',
    'multiple',
  ]);

  const preset = () => resolveAccordionPreset(local.preset);

  // Explicit prop always wins over the preset's value; preset fills the gaps.
  const bordered = () => local.bordered ?? preset().bordered ?? false;
  const multiple = () => local.multiple ?? preset().multiple;
  const density = (): AccordionDensity => local.density ?? preset().density ?? 'default';

  const rootClass = () =>
    local.fluid !== undefined
      ? // Drop `w-full` when fluid is set — it conflicts with `flex: 1 1 Npx`.
        cn(
          'divide-y divide-border',
          bordered() && accordionBorderClass,
          local.rounded && accordionRoundedClass,
          local.nested && accordionNestedClass,
          local.class,
        )
      : cn(
          accordionRootCva({ bordered: bordered(), rounded: local.rounded }),
          local.nested && accordionNestedClass,
          local.class,
        );

  const rootStyle = (): string | undefined =>
    local.fluid !== undefined ? `flex: 1 1 ${local.fluid}px` : undefined;

  return (
    <AccordionDensityContext.Provider value={density}>
      <KobalteAccordion
        class={rootClass()}
        style={rootStyle()}
        multiple={multiple()}
        {...(others as any)}
      />
    </AccordionDensityContext.Provider>
  );
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
  const density = useContext(AccordionDensityContext);
  const [local, others] = splitProps(props, ['class', 'children']);
  return (
    <KobalteAccordion.Header>
      <KobalteAccordion.Trigger
        class={cn(accordionTriggerCva({ density: density() }), local.class)}
        {...(others as any)}
      >
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
