import type { Meta, StoryObj } from 'storybook-solidjs-vite';

import { Flex } from '../layout/flex/flex';
import { Accordion } from '.';

const meta = {
  title: 'ComponentsPalette/Accordion',
  component: Accordion,
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div class="w-full max-w-lg p-8">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Accordion>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Multiple items open independently (multiple=true).
 * This is the primary use-case — e.g. a list of background highlights
 * where each section can be expanded/collapsed independently.
 */
export const Multiple: Story = {
  render: () => (
    <Accordion multiple>
      <Accordion.Item value="section-1">
        <Accordion.Trigger>Section 1 — Colors</Accordion.Trigger>
        <Accordion.Content>
          Configure the color palette for the background highlight. Each color token maps to a CSS
          variable in the active theme.
        </Accordion.Content>
      </Accordion.Item>
      <Accordion.Item value="section-2">
        <Accordion.Trigger>Section 2 — Typography</Accordion.Trigger>
        <Accordion.Content>
          Choose font family, size, line-height, and letter-spacing for the text overlay.
        </Accordion.Content>
      </Accordion.Item>
      <Accordion.Item value="section-3">
        <Accordion.Trigger>Section 3 — Spacing</Accordion.Trigger>
        <Accordion.Content>
          Adjust padding and margin using spacing tokens from the design system (4px grid).
        </Accordion.Content>
      </Accordion.Item>
    </Accordion>
  ),
};

/**
 * Single-open with collapsible: only one item open at a time,
 * and clicking the active trigger collapses it.
 */
export const SingleCollapsible: Story = {
  render: () => (
    <Accordion collapsible>
      <Accordion.Item value="faq-1">
        <Accordion.Trigger>What is Capsule?</Accordion.Trigger>
        <Accordion.Content>
          Capsule is an experimental HCA framework built on Solid.js + XState + TanStack Router. UI
          is a Shadow — the interface is a silent projection of business logic.
        </Accordion.Content>
      </Accordion.Item>
      <Accordion.Item value="faq-2">
        <Accordion.Trigger>How does UiProxy work?</Accordion.Trigger>
        <Accordion.Content>
          UiProxy intercepts UI events (onClick, onInput, onChange…) from View children and routes
          them through ControllerProxy into XState FSM handlers.
        </Accordion.Content>
      </Accordion.Item>
      <Accordion.Item value="faq-3">
        <Accordion.Trigger>What is the Entity layer?</Accordion.Trigger>
        <Accordion.Content>
          Entity is the domain data layer: Zod schema + defaults + meta, with no UI. It is the
          single source of truth for shapes (e.g. User, Product, Order).
        </Accordion.Content>
      </Accordion.Item>
    </Accordion>
  ),
};

/**
 * Disabled item: cannot be expanded, visually dimmed.
 */
export const WithDisabledItem: Story = {
  render: () => (
    <Accordion multiple>
      <Accordion.Item value="enabled-1">
        <Accordion.Trigger>Active section</Accordion.Trigger>
        <Accordion.Content>This section is fully interactive.</Accordion.Content>
      </Accordion.Item>
      <Accordion.Item value="disabled-1" disabled>
        <Accordion.Trigger>Disabled section</Accordion.Trigger>
        <Accordion.Content>This content is not reachable.</Accordion.Content>
      </Accordion.Item>
      <Accordion.Item value="enabled-2">
        <Accordion.Trigger>Another active section</Accordion.Trigger>
        <Accordion.Content>This section is also interactive.</Accordion.Content>
      </Accordion.Item>
    </Accordion>
  ),
};

/**
 * Responsive multi-column layout via `<Flex wrap='wrap'>` + `fluid` prop.
 *
 * Each Accordion receives `fluid={250}` which applies `flex: 1 1 250px` — it
 * grows to fill available space, shrinks when needed, and wraps to a new row
 * when the container is narrower than ~500 px (2 × 250 px basis). This mirrors
 * the canonical `fluid` pattern from `<Flex>` itself.
 *
 * Resize the preview to see columns stack into a single column on narrow viewports.
 */
export const ResponsiveWithFlex: Story = {
  name: 'responsive (Flex+fluid composition)',
  decorators: [
    (Story) => (
      <div style={{ width: '640px', padding: '2rem' }}>
        <Story />
      </div>
    ),
  ],
  render: () => (
    <Flex wrap="wrap" gap={4}>
      <Accordion fluid={250} multiple>
        <Accordion.Item value="a-1">
          <Accordion.Trigger>Colors</Accordion.Trigger>
          <Accordion.Content>
            Configure the color palette for the background highlight.
          </Accordion.Content>
        </Accordion.Item>
        <Accordion.Item value="a-2">
          <Accordion.Trigger>Typography</Accordion.Trigger>
          <Accordion.Content>Choose font family, size, and line-height.</Accordion.Content>
        </Accordion.Item>
      </Accordion>
      <Accordion fluid={250} multiple>
        <Accordion.Item value="b-1">
          <Accordion.Trigger>Spacing</Accordion.Trigger>
          <Accordion.Content>
            Adjust padding and margin using the 4 px spacing grid.
          </Accordion.Content>
        </Accordion.Item>
        <Accordion.Item value="b-2">
          <Accordion.Trigger>Shadows</Accordion.Trigger>
          <Accordion.Content>Pick shadow depth from none / sm / md / lg / xl.</Accordion.Content>
        </Accordion.Item>
      </Accordion>
    </Flex>
  ),
};

/**
 * Controlled: first item is open by default.
 */
export const DefaultOpen: Story = {
  render: () => (
    <Accordion multiple defaultValue={['item-a']}>
      <Accordion.Item value="item-a">
        <Accordion.Trigger>Item A (open by default)</Accordion.Trigger>
        <Accordion.Content>
          This item starts expanded because its value is in `defaultValue`.
        </Accordion.Content>
      </Accordion.Item>
      <Accordion.Item value="item-b">
        <Accordion.Trigger>Item B</Accordion.Trigger>
        <Accordion.Content>Click the trigger to expand.</Accordion.Content>
      </Accordion.Item>
    </Accordion>
  ),
};
