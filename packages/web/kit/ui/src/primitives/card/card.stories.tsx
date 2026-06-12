import type { Meta, StoryObj } from 'storybook-solidjs-vite';

import { Button } from '../button';
import { Card } from '.';

const meta = {
  title: 'Components/Card',
  component: Card,
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div class="max-w-md p-4">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Card>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Card>
      <Card.Header>
        <Card.Title>Capsule</Card.Title>
        <Card.Description>Hyper-Controlled Architecture</Card.Description>
      </Card.Header>
      <Card.Content>
        UI is a Shadow. Logic lives in Controller and Feature; UI is just a typed projection.
      </Card.Content>
      <Card.Footer class="gap-2">
        <Button variant="ghost" size="sm">
          Cancel
        </Button>
        <Button size="sm">Confirm</Button>
      </Card.Footer>
    </Card>
  ),
};

export const HeaderOnly: Story = {
  render: () => (
    <Card>
      <Card.Header>
        <Card.Title>Status</Card.Title>
        <Card.Description>All systems nominal.</Card.Description>
      </Card.Header>
    </Card>
  ),
};

export const ContentOnly: Story = {
  render: () => (
    <Card>
      <Card.Content>Card без header / footer — просто блок-обёртка.</Card.Content>
    </Card>
  ),
};

export const Stack: Story = {
  name: 'stack of cards',
  render: () => (
    <div class="flex flex-col gap-3">
      <Card>
        <Card.Header>
          <Card.Title class="text-sm">Capsules</Card.Title>
        </Card.Header>
        <Card.Content class="pt-0 text-xs text-muted-foreground">
          Active workspace capsules — auto-synced.
        </Card.Content>
      </Card>
      <Card>
        <Card.Header>
          <Card.Title class="text-sm">Open PRs</Card.Title>
        </Card.Header>
        <Card.Content class="pt-0 text-xs text-muted-foreground">
          3 ready for review, 1 draft.
        </Card.Content>
      </Card>
      <Card>
        <Card.Header>
          <Card.Title class="text-sm">System health</Card.Title>
        </Card.Header>
        <Card.Content class="pt-0 text-xs text-muted-foreground">
          All services nominal.
        </Card.Content>
      </Card>
    </div>
  ),
};

// ─── New presentational props ────────────────────────────────────────────────

export const ElevationProps: Story = {
  name: 'elevation — none | sm | md | lg | xl',
  render: () => (
    <div class="flex flex-col gap-4">
      <Card elevation="none">
        <Card.Content>elevation="none" — shadow-none</Card.Content>
      </Card>
      <Card elevation="sm">
        <Card.Content>elevation="sm" — shadow-sm</Card.Content>
      </Card>
      <Card elevation="md">
        <Card.Content>elevation="md" — shadow-md</Card.Content>
      </Card>
      <Card elevation="lg">
        <Card.Content>elevation="lg" — shadow-lg</Card.Content>
      </Card>
      <Card elevation="xl">
        <Card.Content>elevation="xl" — shadow-xl</Card.Content>
      </Card>
    </div>
  ),
};

export const WidthProp: Story = {
  name: 'w — spacing-scale width',
  render: () => (
    <div class="flex flex-col gap-3">
      <Card w={64}>
        <Card.Content>w={64} — 16rem</Card.Content>
      </Card>
      <Card w={96}>
        <Card.Content>w={96} — 24rem (loginForm width)</Card.Content>
      </Card>
    </div>
  ),
};

export const HeaderDivider: Story = {
  name: 'Card.Header divider',
  render: () => (
    <div class="flex flex-col gap-4">
      <Card>
        <Card.Header divider>
          <Card.Title>With divider</Card.Title>
          <Card.Description>border-b border-border below header</Card.Description>
        </Card.Header>
        <Card.Content>Content below the divider line.</Card.Content>
      </Card>
      <Card>
        <Card.Header>
          <Card.Title>Without divider (default)</Card.Title>
          <Card.Description>No border below.</Card.Description>
        </Card.Header>
        <Card.Content>Content without separator.</Card.Content>
      </Card>
    </div>
  ),
};

export const TitleAlign: Story = {
  name: 'Card.Title / Card.Description align',
  render: () => (
    <Card>
      <Card.Header>
        <Card.Title align="center">Centered title</Card.Title>
        <Card.Description align="center">Centered description</Card.Description>
      </Card.Header>
      <Card.Content>
        <Card.Title align="end">Right-aligned title</Card.Title>
        <Card.Description align="end">Right-aligned description</Card.Description>
      </Card.Content>
    </Card>
  ),
};

export const ContentDefaultLayout: Story = {
  name: 'Card.Content — default flex-col gap-cell layout',
  render: () => (
    <Card>
      <Card.Content>
        <div class="rounded bg-muted p-2 text-sm">Item 1 — stacked automatically</div>
        <div class="rounded bg-muted p-2 text-sm">Item 2 — no class needed</div>
        <div class="rounded bg-muted p-2 text-sm">Item 3 — gap-cell from default</div>
      </Card.Content>
    </Card>
  ),
};

export const LoginFormCard: Story = {
  name: 'login form card pattern (w + Header divider + Content defaults)',
  render: () => (
    <Card w={96} elevation="lg">
      <Card.Header divider>
        <Card.Title align="center">Вход</Card.Title>
      </Card.Header>
      <Card.Content>
        <div class="rounded border border-input px-3 py-2 text-sm text-muted-foreground">
          email field placeholder
        </div>
        <div class="rounded border border-input px-3 py-2 text-sm text-muted-foreground">
          password field placeholder
        </div>
        <Button fullWidth>Войти</Button>
      </Card.Content>
    </Card>
  ),
};
