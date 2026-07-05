import { Hash, LayoutGrid, Square, Type } from 'lucide-solid';
import { createSignal, For } from 'solid-js';
import type { Meta, StoryObj } from 'storybook-solidjs-vite';

import { List } from './list';
import { SelectableItem } from './selectableItem';

const meta = {
  title: 'ComponentsPalette/SelectableItem',
  component: SelectableItem,
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div class="w-full max-w-xs p-8">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof SelectableItem>;

export default meta;
type Story = StoryObj<typeof meta>;

const ROWS = [
  { id: 'button', label: 'Button', icon: Square },
  { id: 'layout', label: 'Layout', icon: LayoutGrid },
  { id: 'typography', label: 'Typography', icon: Type },
];

/**
 * A list of selectable rows — one is highlighted. Hover any row to see the
 * accent surface; click to select. Rendered as `List.Item` inside a `List`.
 */
export const InList: Story = {
  render: () => {
    const [selected, setSelected] = createSignal('layout');
    return (
      <List>
        <For each={ROWS}>
          {(r) => (
            <List.Item
              icon={r.icon}
              selected={selected() === r.id}
              onSelect={() => setSelected(r.id)}
            >
              {r.label}
            </List.Item>
          )}
        </For>
      </List>
    );
  },
};

/** Selected vs. default — the accent highlight in isolation. */
export const SelectedState: Story = {
  render: () => (
    <List>
      <SelectableItem selected onSelect={() => {}}>
        Selected row
      </SelectableItem>
      <SelectableItem onSelect={() => {}}>Default row (hover me)</SelectableItem>
    </List>
  ),
};

/** With a leading icon. */
export const WithIcon: Story = {
  render: () => (
    <List>
      <SelectableItem icon={Square} onSelect={() => {}}>
        primary
      </SelectableItem>
      <SelectableItem icon={LayoutGrid} onSelect={() => {}}>
        grid
      </SelectableItem>
    </List>
  ),
};

/** With a trailing slot (e.g. a count badge). */
export const WithTrailing: Story = {
  render: () => (
    <List>
      <SelectableItem
        icon={Hash}
        trailing={<span class="text-muted-foreground">12</span>}
        onSelect={() => {}}
      >
        Tagged
      </SelectableItem>
      <SelectableItem
        icon={Hash}
        trailing={<span class="text-muted-foreground">3</span>}
        onSelect={() => {}}
      >
        Draft
      </SelectableItem>
    </List>
  ),
};
