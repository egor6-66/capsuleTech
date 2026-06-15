import { createSignal } from 'solid-js';
import type { Meta, StoryObj } from 'storybook-solidjs-vite';

import { Slider } from './slider';

const meta = {
  title: 'ComponentsPalette/Slider',
  component: Slider,
  tags: ['autodocs'],
  argTypes: {
    disabled: { control: 'boolean' },
    showValue: { control: 'boolean' },
    label: { control: 'text' },
    min: { control: 'number' },
    max: { control: 'number' },
    step: { control: 'number' },
  },
  args: {
    min: 0,
    max: 1,
    step: 0.01,
    label: 'Alpha',
    showValue: true,
    disabled: false,
  },
} satisfies Meta<typeof Slider>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Default alpha slider (0–1, step 0.01) with label and live value display. */
export const Default: Story = {
  args: { defaultValue: 0.5 },
};

/** Full range 0–100, step 1 — for integer use cases like volume or opacity %. */
export const IntegerRange: Story = {
  name: 'IntegerRange',
  args: {
    min: 0,
    max: 100,
    step: 1,
    defaultValue: 50,
    label: 'Volume',
    showValue: true,
  },
};

/** No label — bare track + thumb only. */
export const NoLabel: Story = {
  args: { label: undefined, showValue: false, defaultValue: 0.3 },
};

/** Disabled state — interaction is blocked, opacity reduced. */
export const Disabled: Story = {
  args: { disabled: true, defaultValue: 0.7 },
};

/** Controlled mode — external signal drives the value; onChange updates it. */
export const Controlled: Story = {
  name: 'controlled',
  render: () => {
    const [alpha, setAlpha] = createSignal(0.5);
    return (
      <div class="flex flex-col gap-4 w-64">
        <Slider
          value={alpha()}
          onChange={setAlpha}
          label="Alpha"
          showValue
          min={0}
          max={1}
          step={0.01}
        />
        <span class="text-xs text-muted-foreground font-mono">
          value = {alpha().toFixed(2)}
        </span>
      </div>
    );
  },
};

/** Multiple sliders showing consistent styling across a settings panel. */
export const SettingsPanel: Story = {
  name: 'SettingsPanel',
  render: () => {
    const [topAlpha, setTopAlpha] = createSignal(0.09);
    const [midAlpha, setMidAlpha] = createSignal(0.7);
    const [botAlpha, setBotAlpha] = createSignal(0.18);
    return (
      <div class="flex flex-col gap-5 w-72 rounded-lg border border-border bg-card p-4">
        <Slider
          value={topAlpha()}
          onChange={setTopAlpha}
          label="Top foreground alpha"
          showValue
          min={0}
          max={1}
          step={0.01}
        />
        <Slider
          value={midAlpha()}
          onChange={setMidAlpha}
          label="Mid card alpha"
          showValue
          min={0}
          max={1}
          step={0.01}
        />
        <Slider
          value={botAlpha()}
          onChange={setBotAlpha}
          label="Bottom primary alpha"
          showValue
          min={0}
          max={1}
          step={0.01}
        />
      </div>
    );
  },
};
