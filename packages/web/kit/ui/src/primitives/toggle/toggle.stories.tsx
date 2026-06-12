import { createSignal } from 'solid-js';
import type { Meta, StoryObj } from 'storybook-solidjs-vite';

import { Toggle } from './toggle';

const meta = {
  title: 'Components/Toggle',
  component: Toggle,
  tags: ['autodocs'],
  argTypes: {
    size: { control: 'inline-radio', options: ['sm', 'md', 'lg'] },
    disabled: { control: 'boolean' },
    label: { control: 'text' },
  },
  args: { size: 'md', label: 'Notifications' },
} satisfies Meta<typeof Toggle>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Checked: Story = { args: { defaultChecked: true } };

export const NoLabel: Story = { args: { label: undefined } };

export const Small: Story = { args: { size: 'sm', defaultChecked: true } };
export const Large: Story = { args: { size: 'lg', defaultChecked: true } };

export const Disabled: Story = { args: { disabled: true, defaultChecked: true } };

export const Controlled: Story = {
  name: 'controlled',
  render: () => {
    const [on, setOn] = createSignal(false);
    return (
      <div class="flex flex-col gap-3 items-start">
        <Toggle checked={on()} onChange={setOn} label="Sync enabled" />
        <span class="text-xs text-muted-foreground font-mono">checked = {String(on())}</span>
      </div>
    );
  },
};
