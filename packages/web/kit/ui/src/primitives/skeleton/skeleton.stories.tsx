import type { Meta, StoryObj } from 'storybook-solidjs-vite';

import { Skeleton } from '.';

const meta = {
  title: 'Components/Skeleton',
  component: Skeleton,
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['text', 'table', 'list', 'card', 'map'],
      description: 'Layout preset. Each variant composes kobalte Skeleton.Root blocks.',
    },
    rows: {
      control: 'number',
      description: 'Number of rows (text/table/list only). Defaults: text=3, table=8, list=5.',
    },
  },
  args: {
    variant: 'text',
  },
  parameters: {
    docs: {
      description: {
        component:
          'Placeholder for loading states. Each shard is a @kobalte/core Skeleton.Root ' +
          '(provides role="group", data-animate, a11y id). Visual pulse and layout presets are our layer on top.',
      },
    },
  },
} satisfies Meta<typeof Skeleton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Text: Story = {
  args: { variant: 'text', rows: 3 },
};

export const TextSingleLine: Story = {
  args: { variant: 'text', rows: 1 },
};

export const TextManyLines: Story = {
  args: { variant: 'text', rows: 6 },
};

export const Table: Story = {
  args: { variant: 'table', rows: 8 },
  decorators: [(Story) => <div style={{ height: '320px', width: '100%' }}>{Story()}</div>],
};

export const TableFewRows: Story = {
  args: { variant: 'table', rows: 3 },
  decorators: [(Story) => <div style={{ height: '200px', width: '100%' }}>{Story()}</div>],
};

export const List: Story = {
  args: { variant: 'list', rows: 5 },
};

export const ListShort: Story = {
  args: { variant: 'list', rows: 2 },
};

export const Card: Story = {
  args: { variant: 'card' },
  decorators: [(Story) => <div style={{ 'max-width': '360px' }}>{Story()}</div>],
};

export const MapVariant: Story = {
  name: 'Map',
  args: { variant: 'map' },
  decorators: [(Story) => <div style={{ height: '400px', width: '100%' }}>{Story()}</div>],
};
