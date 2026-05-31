import type { Meta, StoryObj } from 'storybook-solidjs-vite';
import { createSignal } from 'solid-js';

import { WidgetSettingsToggle } from './widgetSettingsToggle';

const meta = {
  title: 'Composites/WidgetSettingsToggle',
  component: WidgetSettingsToggle,
  tags: ['autodocs'],
  decorators: [
    (Story: () => import('solid-js').JSX.Element) => (
      <div class="flex flex-col gap-4 p-6">
        {Story()}
      </div>
    ),
  ],
} satisfies Meta<typeof WidgetSettingsToggle>;

export default meta;
type Story = StoryObj<typeof meta>;

// ---------------------------------------------------------------------------
// Default
// ---------------------------------------------------------------------------

export const Default: Story = {
  name: 'default',
  render: () => <WidgetSettingsToggle />,
};

// ---------------------------------------------------------------------------
// WithCallback — logs each settingsMode transition
// ---------------------------------------------------------------------------

export const WithCallback: Story = {
  name: 'with onChange callback',
  render: () => {
    const [log, setLog] = createSignal<string[]>([]);
    return (
      <div class="flex flex-col gap-2">
        <WidgetSettingsToggle
          onChange={(on) => setLog((prev) => [...prev, `settings: ${on}`])}
        />
        <ul class="text-xs text-muted-foreground">
          {log().map((entry, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: stable static list
            <li key={i}>{entry}</li>
          ))}
        </ul>
      </div>
    );
  },
};

// ---------------------------------------------------------------------------
// WithExtraClass — demonstrates class forwarding
// ---------------------------------------------------------------------------

export const WithExtraClass: Story = {
  name: 'with extra class (larger)',
  render: () => <WidgetSettingsToggle class="text-base px-5 py-2.5" />,
};
