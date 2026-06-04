import type { Meta, StoryObj } from 'storybook-solidjs-vite';
import { createSignal } from 'solid-js';

import { Select } from './select';

const FRAMEWORK_OPTIONS = [
  { value: 'solid', label: 'Solid.js' },
  { value: 'react', label: 'React' },
  { value: 'vue', label: 'Vue' },
  { value: 'svelte', label: 'Svelte' },
  { value: 'angular', label: 'Angular', disabled: true },
];

const meta = {
  title: 'Components/Select',
  component: Select,
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div class="min-h-48 max-w-xs p-4">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Select>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Convenience mode — pass `options` array and the component handles the rest. */
export const Basic: Story = {
  render: () => (
    <Select
      options={FRAMEWORK_OPTIONS}
      placeholder="Select framework…"
    />
  ),
};

/** Controlled value — demonstrates reading and writing external signal. */
export const Controlled: Story = {
  render: () => {
    const [value, setValue] = createSignal<string | null>(null);
    return (
      <div class="flex flex-col gap-2">
        <Select
          options={FRAMEWORK_OPTIONS}
          value={value()}
          onChange={setValue}
          placeholder="Select framework…"
        />
        <p class="text-sm text-muted-foreground">
          Selected: {value() ?? '(none)'}
        </p>
      </div>
    );
  },
};

/** One option is disabled — Angular cannot be selected. */
export const WithDisabledOption: Story = {
  render: () => (
    <Select
      options={FRAMEWORK_OPTIONS}
      placeholder="Angular is disabled…"
    />
  ),
};

/** Compound mode — custom trigger layout via Select.Trigger + Select.Content. */
export const Compound: Story = {
  render: () => {
    const [value, setValue] = createSignal<string | null>(null);
    return (
      <Select
        options={FRAMEWORK_OPTIONS}
        value={value()}
        onChange={setValue}
        placeholder="Custom layout…"
      >
        <Select.Trigger class="gap-3">
          <Select.Value />
        </Select.Trigger>
        <Select.Content />
      </Select>
    );
  },
};

/** Disabled select — trigger is non-interactive. */
export const Disabled: Story = {
  render: () => (
    <Select
      options={FRAMEWORK_OPTIONS}
      disabled
      placeholder="Cannot be opened"
    />
  ),
};

/** Preset value — opens with a pre-selected item. */
export const WithDefaultValue: Story = {
  render: () => (
    <Select
      options={FRAMEWORK_OPTIONS}
      defaultValue="solid"
      placeholder="Select framework…"
    />
  ),
};
