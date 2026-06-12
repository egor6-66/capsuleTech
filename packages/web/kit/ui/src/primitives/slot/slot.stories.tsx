import type { Meta, StoryObj } from 'storybook-solidjs-vite';

import { Slot } from './slot';

const meta = {
  title: 'Components/Slot',
  component: Slot,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Slot — тонкая обёртка над `@kobalte/core/polymorphic`. Используется внутри других primitives для реализации `as`-пропа. Самостоятельно вне ui-kit обычно не нужен.',
      },
    },
  },
  decorators: [
    (Story) => (
      <div class="p-6">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Slot>;

export default meta;
type Story = StoryObj<typeof meta>;

export const AsDiv: Story = {
  name: 'as div (default)',
  render: () => (
    <Slot class="rounded-md border border-border bg-card p-4 text-card-foreground">
      Rendered as div
    </Slot>
  ),
};

export const AsLink: Story = {
  name: 'as <a>',
  render: () => (
    <Slot as="a" href="https://example.com" class="text-primary underline-offset-4 hover:underline">
      Rendered as anchor
    </Slot>
  ),
};

export const AsSection: Story = {
  name: 'as section',
  render: () => (
    <Slot as="section" class="rounded-md border border-dashed border-border p-4 text-sm">
      Rendered as semantic section
    </Slot>
  ),
};
