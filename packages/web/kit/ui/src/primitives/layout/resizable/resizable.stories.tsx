import { createSignal } from 'solid-js';
import type { Meta, StoryObj } from 'storybook-solidjs-vite';

import { MockBlock } from '../../_mocks';
import { Resizable } from './resizable';

const meta = {
  title: 'ComponentsPalette/Resizable',
  component: Resizable,
  tags: ['autodocs'],
  parameters: { layout: 'padded' },
} satisfies Meta<typeof Resizable>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Basic: Story = {
  name: 'items: two panels',
  render: () => (
    <div class="h-48">
      <Resizable
        orientation="horizontal"
        withHandle
        items={[
          { children: <MockBlock label="left" />, resizable: true, initialSize: 0.4 },
          { children: <MockBlock label="right" tone="b" />, resizable: true, initialSize: 0.6 },
        ]}
      />
    </div>
  ),
};

export const MixedHandles: Story = {
  name: 'handleActive: mixed (one active, one not)',
  render: () => (
    <div class="h-48">
      <Resizable
        orientation="horizontal"
        withHandle
        items={[
          { children: <MockBlock label="A" />, resizable: true, initialSize: 0.3 },
          { children: <MockBlock label="B" tone="b" />, resizable: true, initialSize: 0.3 },
          {
            children: <MockBlock label="C (locked)" tone="c" />,
            resizable: true,
            initialSize: 0.4,
            handleActive: false,
          },
        ]}
      />
    </div>
  ),
};

export const LiveToggle: Story = {
  name: 'handleActive: live accessor flip (no panel remount)',
  render: () => {
    const [active, setActive] = createSignal(true);
    return (
      <div class="flex h-56 flex-col gap-2">
        <button
          type="button"
          class="self-start rounded-md border px-button py-1.5 text-sm"
          onClick={() => setActive((v) => !v)}
        >
          handleActive: {String(active())}
        </button>
        <div class="min-h-0 flex-1">
          <Resizable
            orientation="horizontal"
            withHandle
            items={[
              { children: <MockBlock label="left" />, resizable: true, initialSize: 0.5 },
              {
                children: <MockBlock label="right" tone="b" />,
                resizable: true,
                initialSize: 0.5,
                handleActive: active,
              },
            ]}
          />
        </div>
      </div>
    );
  },
};

export const AllDisabled: Story = {
  name: 'handleDisabled: container gate (no hairline)',
  render: () => (
    <div class="h-48">
      <Resizable
        orientation="horizontal"
        withHandle
        handleDisabled
        items={[
          { children: <MockBlock label="A" />, resizable: true, initialSize: 0.5 },
          { children: <MockBlock label="B" tone="b" />, resizable: true, initialSize: 0.5 },
        ]}
      />
    </div>
  ),
};
