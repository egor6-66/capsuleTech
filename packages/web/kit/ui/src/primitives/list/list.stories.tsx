import type { Meta, StoryObj } from 'storybook-solidjs-vite';

import { List } from './list';

const NAV = [
  { id: 1, label: 'Home', active: true },
  { id: 2, label: 'Inbox' },
  { id: 3, label: 'Files' },
  { id: 4, label: 'Settings' },
];

// Batch mode: template component
function NavItem(props: { label: string; active?: boolean }) {
  return (
    <li
      class={`rounded-md px-3 py-2 text-sm ${
        props.active
          ? 'bg-primary text-primary-foreground'
          : 'hover:bg-accent hover:text-accent-foreground'
      }`}
    >
      {props.label}
    </li>
  );
}

const BIG = Array.from({ length: 1000 }, (_, i) => ({
  id: i,
  label: `Row #${i + 1}`,
}));

const meta = {
  title: 'ComponentsPalette/List',
  component: List,
  tags: ['autodocs'],
  argTypes: {
    orientation: { control: 'inline-radio', options: ['vertical', 'horizontal'] },
    variant: { control: 'inline-radio', options: ['default', 'flush'] },
  },
  args: { orientation: 'vertical', variant: 'default' },
  decorators: [
    (Story) => (
      <div class="max-w-sm p-4">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof List>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: (args) => (
    <List
      {...args}
      items={NAV}
      children={(item) => (
        <div
          class={`rounded-md px-3 py-2 text-sm ${
            item.active
              ? 'bg-primary text-primary-foreground'
              : 'hover:bg-accent hover:text-accent-foreground'
          }`}
        >
          {item.label}
        </div>
      )}
    />
  ),
};

export const Horizontal: Story = {
  args: { orientation: 'horizontal' },
  render: (args) => (
    <List
      {...args}
      items={NAV}
      children={(item) => (
        <div class="rounded-md border border-border px-3 py-1.5 text-sm">{item.label}</div>
      )}
    />
  ),
};

export const Flush: Story = {
  args: { variant: 'flush' },
  render: (args) => (
    <List
      {...args}
      items={NAV}
      children={(item) => (
        <div class="border-b border-border px-3 py-2 text-sm last:border-0">{item.label}</div>
      )}
    />
  ),
};

export const Virtual: Story = {
  name: 'virtual · 1000 rows',
  decorators: [
    (Story) => (
      <div class="h-72 max-w-sm p-4">
        <Story />
      </div>
    ),
  ],
  render: () => (
    <List.Virtual
      items={BIG}
      estimateSize={36}
      children={(item) => (
        <div class="border-b border-border px-3 py-2 text-sm font-mono">{item.label}</div>
      )}
    />
  ),
};

export const BatchMode: Story = {
  name: 'batch mode · data + item (ADR 036 §3)',
  render: (args) => (
    <List
      {...args}
      data={NAV}
      item={{ use: NavItem, props: (item) => ({ label: item.label, active: item.active }) }}
    />
  ),
};

// Grid mode: gauge/stat card tiles
function StatCard(props: { label: string; value: string }) {
  return (
    <li class="rounded-lg border border-border bg-card p-4 text-sm">
      <div class="text-muted-foreground text-xs">{props.label}</div>
      <div class="mt-1 text-xl font-semibold text-foreground">{props.value}</div>
    </li>
  );
}

const STATS = [
  { label: 'CPU', value: '42 %' },
  { label: 'RAM', value: '6.1 GB' },
  { label: 'Disk', value: '78 %' },
  { label: 'Net', value: '1.2 MB/s' },
  { label: 'GPU', value: '31 %' },
  { label: 'Temp', value: '64 °C' },
];

export const GridAutoFit: Story = {
  name: 'batch mode · grid auto-fit (min="116px")',
  decorators: [
    (Story) => (
      <div class="w-full p-4">
        <Story />
      </div>
    ),
  ],
  render: () => (
    <List
      data={STATS}
      item={{ use: StatCard, props: (item) => ({ label: item.label, value: item.value }) }}
      min="116px"
    />
  ),
};

export const GridAutoFitCustomGap: Story = {
  name: 'batch mode · grid auto-fit with custom gap',
  decorators: [
    (Story) => (
      <div class="w-full p-4">
        <Story />
      </div>
    ),
  ],
  render: () => (
    <List
      data={STATS}
      item={{ use: StatCard, props: (item) => ({ label: item.label, value: item.value }) }}
      min="140px"
      gap="1rem"
    />
  ),
};

export const Semantic: Story = {
  name: 'semantic · plain children',
  render: (args) => (
    <List {...args}>
      <li class="rounded-md px-3 py-2 text-sm hover:bg-accent">Home</li>
      <li class="rounded-md px-3 py-2 text-sm hover:bg-accent">Inbox</li>
      <li class="rounded-md px-3 py-2 text-sm hover:bg-accent">Settings</li>
    </List>
  ),
};
