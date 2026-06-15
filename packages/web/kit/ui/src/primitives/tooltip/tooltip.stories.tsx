import type { Meta, StoryObj } from 'storybook-solidjs-vite';

import { Button } from '../button';
import { Tooltip } from '.';

const meta = {
  title: 'ComponentsPalette/Tooltip',
  component: Tooltip,
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div class="flex min-h-64 items-center justify-center p-16">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Tooltip>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Default tooltip anchored to the cursor position. Hover to see it appear near the pointer. */
export const Default: Story = {
  render: () => (
    <Tooltip>
      <Tooltip.Trigger as={Button} variant="outline">
        Hover me
      </Tooltip.Trigger>
      <Tooltip.Content>Save document</Tooltip.Content>
    </Tooltip>
  ),
};

/** Long text wraps naturally inside the panel without explicit width. */
export const LongText: Story = {
  render: () => (
    <Tooltip>
      <Tooltip.Trigger as={Button} variant="outline">
        Long tooltip
      </Tooltip.Trigger>
      <Tooltip.Content>
        This is a longer tooltip message that provides additional context about what this action
        does. It wraps naturally.
      </Tooltip.Content>
    </Tooltip>
  ),
};

/**
 * Demonstrates cursor-anchored positioning on a tall element.
 * Hover the top, middle, or bottom of the box — the tooltip appears
 * near your cursor, not at the element's bottom edge.
 */
export const LargeElement: Story = {
  render: () => (
    <Tooltip>
      <Tooltip.Trigger
        as="div"
        class="flex h-64 w-80 cursor-default items-center justify-center rounded-lg border border-border bg-muted text-muted-foreground text-sm select-none"
      >
        Hover anywhere inside — tooltip follows your cursor
      </Tooltip.Trigger>
      <Tooltip.Content>Appears near your cursor, not at the element edge</Tooltip.Content>
    </Tooltip>
  ),
};

/** Element-anchored (classic) behaviour — panel anchors to the trigger bounding box. */
export const ElementAnchored: Story = {
  render: () => (
    <Tooltip cursorTracking={false}>
      <Tooltip.Trigger as={Button} variant="secondary">
        Element-anchored
      </Tooltip.Trigger>
      <Tooltip.Content>Anchored to the button's bounding box</Tooltip.Content>
    </Tooltip>
  ),
};

/** With an optional decorative arrow. Arrow must be placed inside Tooltip.Content. */
export const WithArrow: Story = {
  render: () => (
    <Tooltip>
      <Tooltip.Trigger as={Button} variant="outline">
        With arrow
      </Tooltip.Trigger>
      <Tooltip.Content>
        Tooltip with arrow
        <Tooltip.Arrow />
      </Tooltip.Content>
    </Tooltip>
  ),
};

/** Custom open/close delay. */
export const CustomDelay: Story = {
  render: () => (
    <Tooltip openDelay={800} closeDelay={200}>
      <Tooltip.Trigger as={Button} variant="outline">
        Slow open (800ms)
      </Tooltip.Trigger>
      <Tooltip.Content>Takes 800ms to appear</Tooltip.Content>
    </Tooltip>
  ),
};

/** Disabled tooltip — the panel never opens. */
export const Disabled: Story = {
  render: () => (
    <Tooltip disabled>
      <Tooltip.Trigger as={Button} variant="outline">
        No tooltip
      </Tooltip.Trigger>
      <Tooltip.Content>You will never see this</Tooltip.Content>
    </Tooltip>
  ),
};
