import type { Meta, StoryObj } from 'storybook-solidjs-vite';

import { MockBlock, MockMain, MockRightBar, MockSidebar } from '../../_mocks';
import { Flex } from './flex';

const meta = {
  title: 'Components/Flex',
  component: Flex,
  tags: ['autodocs'],
  parameters: { layout: 'padded' },
} satisfies Meta<typeof Flex>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Row: Story = {
  name: 'direction: row',
  render: () => (
    <Flex gap={2} class="h-24">
      <MockBlock label="A" />
      <MockBlock label="B" tone="b" />
      <MockBlock label="C" tone="c" />
    </Flex>
  ),
};

export const Column: Story = {
  name: 'direction: col',
  render: () => (
    <Flex direction="col" gap={2} class="h-64 w-48">
      <MockBlock label="A" />
      <MockBlock label="B" tone="b" />
      <MockBlock label="C" tone="c" />
    </Flex>
  ),
};

export const Centered: Story = {
  name: 'align/justify: center',
  render: () => (
    <Flex
      align="center"
      justify="center"
      gap={4}
      class="h-40 w-full border border-dashed border-white/15"
    >
      <MockBlock label="centered" tone="b" />
    </Flex>
  ),
};

export const Between: Story = {
  name: 'justify: between',
  render: () => (
    <Flex justify="between" align="center" class="h-16 w-full">
      <MockBlock label="left" tone="b" />
      <MockBlock label="middle" />
      <MockBlock label="right" tone="c" />
    </Flex>
  ),
};

export const Wrap: Story = {
  name: 'wrap',
  render: () => (
    <Flex wrap="wrap" gap={2} class="w-96">
      <MockBlock label="1" />
      <MockBlock label="2" tone="b" />
      <MockBlock label="3" tone="c" />
      <MockBlock label="4" />
      <MockBlock label="5" tone="b" />
      <MockBlock label="6" tone="c" />
    </Flex>
  ),
};

/**
 * Resizable horizontal — два panel'я с drag-handle между ними.
 * Sum sizes = 100%. Drag the handle to redistribute.
 */
export const ResizableHorizontal: Story = {
  name: 'resizable · horizontal',
  parameters: { layout: 'fullscreen' },
  decorators: [
    (Story) => (
      <div class="h-[520px] w-full border border-dashed border-white/15 overflow-hidden">
        <Story />
      </div>
    ),
  ],
  render: () => (
    <Flex
      orientation="horizontal"
      items={[
        { children: <MockSidebar />, resizable: true, initialSize: 0.28, minSize: 0.15 },
        { children: <MockMain />, resizable: true },
      ]}
      withHandle
    />
  ),
};

/**
 * Resizable vertical — два panel'я по вертикали с drag-handle.
 */
export const ResizableVertical: Story = {
  name: 'resizable · vertical',
  parameters: { layout: 'fullscreen' },
  decorators: [
    (Story) => (
      <div class="h-[520px] w-full border border-dashed border-white/15 overflow-hidden">
        <Story />
      </div>
    ),
  ],
  render: () => (
    <Flex
      orientation="vertical"
      items={[
        { children: <MockSidebar />, resizable: true, initialSize: 0.3, minSize: 0.15 },
        { children: <MockMain />, resizable: true },
      ]}
      withHandle
    />
  ),
};

/**
 * Sizing props: `minH`, `h`, `w` через spacing-шкалу.
 * `minH={24}` → `min-height: calc(var(--spacing) * 24)` (≡ Tailwind `min-h-24`).
 * Позволяет задавать размеры без сырых Tailwind-классов снаружи.
 */
export const SizingProps: Story = {
  name: 'sizing props (h / minH / w)',
  render: () => (
    <Flex direction="col" gap={4}>
      <Flex
        minH={24}
        align="center"
        justify="center"
        class="border border-dashed border-white/20 rounded"
      >
        <MockBlock label="minH={24}" tone="b" />
      </Flex>
      <Flex
        h={16}
        align="center"
        justify="center"
        class="border border-dashed border-white/20 rounded"
      >
        <MockBlock label="h={16}" tone="c" />
      </Flex>
      <Flex
        w={64}
        minH={12}
        align="center"
        class="border border-dashed border-white/20 rounded"
      >
        <MockBlock label="w={64} minH={12}" />
      </Flex>
    </Flex>
  ),
};

/**
 * Mixed: один panel fixed (resizable: false), два resizable.
 * Handle появляется только между resizable соседями — у right (resizable:false)
 * handle справа нет.
 */
export const MixedFixedAndResizable: Story = {
  name: 'resizable · mixed (fixed right panel)',
  parameters: { layout: 'fullscreen' },
  decorators: [
    (Story) => (
      <div class="h-[520px] w-full border border-dashed border-white/15 overflow-hidden">
        <Story />
      </div>
    ),
  ],
  render: () => (
    <Flex
      orientation="horizontal"
      items={[
        { children: <MockSidebar />, resizable: true, initialSize: 0.22, minSize: 0.12 },
        { children: <MockMain />, resizable: true },
        { children: <MockRightBar />, resizable: false, initialSize: 0.25 },
      ]}
      withHandle
    />
  ),
};
