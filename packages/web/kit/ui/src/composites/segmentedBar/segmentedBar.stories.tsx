import { createSignal } from 'solid-js';
import type { Meta, StoryObj } from 'storybook-solidjs-vite';

import { SegmentedBar } from '.';

const ITEMS = [
  { id: 'explorer', label: 'Проводник' },
  { id: 'collections', label: 'Коллекции' },
  { id: 'saved', label: 'Сохранённое' },
];

const meta = {
  title: 'ComponentsPalette/SegmentedBar',
  component: SegmentedBar,
  tags: ['autodocs'],
  parameters: { layout: 'centered' },
} satisfies Meta<typeof SegmentedBar>;

export default meta;
type Story = StoryObj<typeof meta>;

// Interactive — активный сегмент подсвечен, клик переключает.
export const Default: Story = {
  render: () => {
    const [active, setActive] = createSignal('explorer');
    return <SegmentedBar items={ITEMS} activeId={active()} onSelect={setActive} />;
  },
};

// Без активного сегмента — все ghost.
export const NoActive: Story = {
  render: () => <SegmentedBar items={ITEMS} onSelect={() => {}} />,
};

// Passthrough-класс: центрирование группы в родителе (как learn Nav).
export const Centered: Story = {
  render: () => {
    const [active, setActive] = createSignal('collections');
    return (
      <div class="w-[480px] rounded border border-border p-4">
        <SegmentedBar
          items={ITEMS}
          activeId={active()}
          onSelect={setActive}
          class="mx-auto w-fit"
        />
      </div>
    );
  },
};
