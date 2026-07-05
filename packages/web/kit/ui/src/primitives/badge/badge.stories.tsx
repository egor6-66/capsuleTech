import { createSignal, For } from 'solid-js';
import type { Meta, StoryObj } from 'storybook-solidjs-vite';

import { Badge } from '.';

const meta = {
  title: 'Primitives/Badge',
  component: Badge,
  tags: ['autodocs'],
  parameters: { layout: 'centered' },
} satisfies Meta<typeof Badge>;

export default meta;
type Story = StoryObj<typeof meta>;

// Все тоны статической пилюли.
export const Tones: Story = {
  render: () => (
    <div class="flex items-center gap-2">
      <Badge tone="default">default</Badge>
      <Badge tone="muted">muted</Badge>
      <Badge tone="outline">outline</Badge>
      <Badge tone="accent">accent</Badge>
    </div>
  ),
};

// Дефолт — muted (замена `Card padding=sm + Typography muted`).
export const Muted: Story = {
  render: () => <Badge>#core</Badge>,
};

// Outline — контурная пилюля.
export const Outline: Story = {
  render: () => <Badge tone="outline">draft</Badge>,
};

// Accent — акцентная пилюля.
export const Accent: Story = {
  render: () => <Badge tone="accent">new</Badge>,
};

// Размеры sm / md.
export const Sizes: Story = {
  render: () => (
    <div class="flex items-center gap-2">
      <Badge size="sm">sm</Badge>
      <Badge size="md">md</Badge>
    </div>
  ),
};

// Интерактивный чип — клик переключает выбранный (rule/word-chip).
export const Interactive: Story = {
  render: () => {
    const WORDS = ['#verb', '#noun', '#adj', '#adv'];
    const [selected, setSelected] = createSignal('#verb');
    return (
      <div class="flex items-center gap-2">
        <For each={WORDS}>
          {(w) => (
            <Badge
              tone="outline"
              interactive
              selected={selected() === w}
              onClick={() => setSelected(w)}
            >
              {w}
            </Badge>
          )}
        </For>
      </div>
    );
  },
};

// Выбранный vs невыбранный интерактивный чип.
export const InteractiveSelected: Story = {
  render: () => (
    <div class="flex items-center gap-2">
      <Badge tone="outline" interactive selected onClick={() => {}}>
        selected
      </Badge>
      <Badge tone="outline" interactive onClick={() => {}}>
        not selected
      </Badge>
    </div>
  ),
};
