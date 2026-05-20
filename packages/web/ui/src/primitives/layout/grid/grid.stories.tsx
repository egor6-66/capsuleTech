import type { Meta, StoryObj } from 'storybook-solidjs-vite';

import { MockBlock } from '../../_mocks';
import { Grid } from './grid';

const meta = {
  title: 'Components/Grid',
  component: Grid,
  tags: ['autodocs'],
  parameters: { layout: 'padded' },
} satisfies Meta<typeof Grid>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Basic: Story = {
  name: 'cols: 3, gap: 4',
  render: () => (
    <Grid cols={3} gap={4} class="h-64">
      <MockBlock label="A" />
      <MockBlock label="B" tone="b" />
      <MockBlock label="C" tone="c" />
      <MockBlock label="D" tone="b" />
      <MockBlock label="E" />
      <MockBlock label="F" tone="c" />
    </Grid>
  ),
};

export const TrackString: Story = {
  name: 'cols: "200px 1fr 200px"',
  render: () => (
    <Grid cols="200px 1fr 200px" gap={2} class="h-32">
      <MockBlock label="200px" tone="b" />
      <MockBlock label="1fr" />
      <MockBlock label="200px" tone="b" />
    </Grid>
  ),
};

export const Spans: Story = {
  name: 'Grid.Item span',
  render: () => (
    <Grid cols={12} gap={2} class="h-32">
      <Grid.Item span={4}>
        <MockBlock label="span 4" tone="b" />
      </Grid.Item>
      <Grid.Item span={8}>
        <MockBlock label="span 8" />
      </Grid.Item>
      <Grid.Item span={6}>
        <MockBlock label="span 6" tone="c" />
      </Grid.Item>
      <Grid.Item span={6}>
        <MockBlock label="span 6" />
      </Grid.Item>
    </Grid>
  ),
};

export const Areas: Story = {
  name: 'areas',
  render: () => (
    <Grid
      areas={['header header', 'sidebar main', 'footer footer']}
      cols="200px 1fr"
      rows="auto 1fr auto"
      gap={2}
      class="h-64"
    >
      <Grid.Item area="header">
        <MockBlock label="header" tone="b" />
      </Grid.Item>
      <Grid.Item area="sidebar">
        <MockBlock label="sidebar" tone="c" />
      </Grid.Item>
      <Grid.Item area="main">
        <MockBlock label="main" />
      </Grid.Item>
      <Grid.Item area="footer">
        <MockBlock label="footer" tone="b" />
      </Grid.Item>
    </Grid>
  ),
};
