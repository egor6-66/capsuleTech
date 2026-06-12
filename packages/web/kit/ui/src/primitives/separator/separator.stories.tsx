import type { Meta, StoryObj } from 'storybook-solidjs-vite';

import { Separator } from './separator';

const meta = {
  title: 'Components/Separator',
  component: Separator,
  tags: ['autodocs'],
  argTypes: {
    orientation: { control: 'inline-radio', options: ['horizontal', 'vertical'] },
    decorative: { control: 'boolean' },
  },
  args: { orientation: 'horizontal', decorative: true },
} satisfies Meta<typeof Separator>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Horizontal: Story = {
  render: (args) => (
    <div class="w-72 p-4">
      <p class="text-sm">Above the line</p>
      <Separator {...args} />
      <p class="text-sm">Below the line</p>
    </div>
  ),
};

export const Vertical: Story = {
  args: { orientation: 'vertical' },
  render: (args) => (
    <div class="flex h-20 items-center gap-3 p-4">
      <span class="text-sm">Left</span>
      <Separator {...args} />
      <span class="text-sm">Middle</span>
      <Separator {...args} />
      <span class="text-sm">Right</span>
    </div>
  ),
};

export const Semantic: Story = {
  name: 'semantic (non-decorative)',
  args: { decorative: false },
  render: (args) => (
    <div class="w-72 p-4">
      <p class="text-sm">Section A</p>
      <Separator {...args} />
      <p class="text-sm">Section B (announced to screen readers)</p>
    </div>
  ),
};
