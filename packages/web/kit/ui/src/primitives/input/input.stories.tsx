import type { Meta, StoryObj } from 'storybook-solidjs-vite';

import { Input } from './input';

const meta = {
  title: 'Components/Input',
  component: Input,
  tags: ['autodocs'],
  argTypes: {
    type: {
      control: 'select',
      options: ['text', 'email', 'password', 'search', 'number', 'tel', 'url'],
    },
    disabled: { control: 'boolean' },
    placeholder: { control: 'text' },
  },
  args: { type: 'text', placeholder: 'Type something…' },
  decorators: [
    (Story) => (
      <div class="max-w-sm p-4">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Input>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Email: Story = { args: { type: 'email', placeholder: 'you@example.com' } };
export const Password: Story = { args: { type: 'password', placeholder: '••••••••' } };
export const Search: Story = { args: { type: 'search', placeholder: 'Search…' } };
export const NumberInput: Story = { args: { type: 'number', placeholder: '42' } };

export const Disabled: Story = {
  args: { disabled: true, value: 'Read-only', placeholder: 'Disabled' },
};

export const WithValue: Story = { args: { value: 'preset value' } };
