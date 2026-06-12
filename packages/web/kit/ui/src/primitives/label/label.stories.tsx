import type { Meta, StoryObj } from 'storybook-solidjs-vite';

import { Input } from '../input';
import { Label } from './label';

const meta = {
  title: 'Components/Label',
  component: Label,
  tags: ['autodocs'],
  argTypes: {
    children: { control: 'text' },
  },
  args: { children: 'Email address' },
  decorators: [
    (Story) => (
      <div class="max-w-sm p-4">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Label>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithInput: Story = {
  name: 'paired with input',
  render: () => (
    <div class="flex flex-col gap-2">
      <Label for="email">Email address</Label>
      <Input id="email" type="email" placeholder="you@example.com" />
    </div>
  ),
};

export const Required: Story = {
  render: () => (
    <Label>
      Email <span class="text-destructive">*</span>
    </Label>
  ),
};
