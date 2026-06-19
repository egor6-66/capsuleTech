import type { Meta, StoryObj } from 'storybook-solidjs-vite';

import { Textarea } from './textarea';

const meta = {
  title: 'ComponentsPalette/Textarea',
  component: Textarea,
  tags: ['autodocs'],
  argTypes: {
    size: {
      control: 'select',
      options: ['sm', 'default', 'lg'],
    },
    resize: {
      control: 'select',
      options: ['none', 'vertical', 'horizontal', 'both'],
    },
    disabled: { control: 'boolean' },
    placeholder: { control: 'text' },
    rows: { control: 'number' },
  },
  args: { placeholder: 'Type something…', rows: 4 },
  decorators: [
    (Story) => (
      <div class="max-w-sm p-4">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Textarea>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Small: Story = { args: { size: 'sm', placeholder: 'Small textarea' } };
export const Large: Story = { args: { size: 'lg', placeholder: 'Large textarea' } };

export const ResizeNone: Story = {
  args: { resize: 'none', placeholder: 'Cannot be resized' },
};

export const ResizeBoth: Story = {
  args: { resize: 'both', placeholder: 'Freely resizable' },
};

export const Disabled: Story = {
  args: { disabled: true, value: 'Read-only content', placeholder: 'Disabled' },
};

export const WithValue: Story = {
  args: { value: 'Preset multiline\ncontent here', rows: 3 },
};

export const LongContent: Story = {
  args: {
    value:
      'This is a longer piece of text that spans multiple lines to demonstrate how the textarea handles overflow and scrolling when content exceeds the visible area of the control.',
    rows: 3,
    resize: 'none',
  },
};
