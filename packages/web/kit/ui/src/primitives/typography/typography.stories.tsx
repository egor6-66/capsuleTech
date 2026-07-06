import type { Meta, StoryObj } from 'storybook-solidjs-vite';

import { Typography } from './typography';

const meta = {
  title: 'ComponentsPalette/Typography',
  component: Typography,
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['h1', 'h2', 'h3', 'p', 'blockquote', 'code', 'lead', 'muted'],
    },
    color: {
      control: 'inline-radio',
      options: ['default', 'muted', 'primary', 'destructive'],
    },
    align: {
      control: 'inline-radio',
      options: ['start', 'center', 'end'],
    },
    tone: {
      control: 'inline-radio',
      options: ['default', 'muted', 'destructive', 'primary'],
    },
    size: {
      control: 'select',
      options: ['xs', 'sm', 'base', 'lg', 'xl', '2xl', '3xl', '4xl', '5xl'],
    },
    dim: { control: 'boolean' },
  },
  args: { variant: 'p', color: 'default' },
  decorators: [
    (Story) => (
      <div class="max-w-xl p-6">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Typography>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: (args) => <Typography {...args}>The quick brown fox jumps over the lazy dog.</Typography>,
};

export const H1: Story = {
  args: { variant: 'h1' },
  render: (args) => <Typography {...args}>Capsule Framework</Typography>,
};

export const H2: Story = {
  args: { variant: 'h2' },
  render: (args) => <Typography {...args}>Hyper-Controlled Architecture</Typography>,
};

export const H3: Story = {
  args: { variant: 'h3' },
  render: (args) => <Typography {...args}>Controller & Feature</Typography>,
};

export const Lead: Story = {
  args: { variant: 'lead' },
  render: (args) => (
    <Typography {...args}>
      UI is a Shadow — interface is a typed projection of logic. All power lives in the Controller.
    </Typography>
  ),
};

export const Blockquote: Story = {
  args: { variant: 'blockquote' },
  render: (args) => (
    <Typography {...args}>
      "No upward imports, no horizontal imports, stateless Entities."
    </Typography>
  ),
};

export const Code: Story = {
  args: { variant: 'code' },
  render: (args) => <Typography {...args}>npm install @capsuletech/web-ui</Typography>,
};

export const Muted: Story = {
  args: { variant: 'muted' },
  render: (args) => (
    <Typography {...args}>
      Hint text — use for helper messages and secondary annotations.
    </Typography>
  ),
};

export const Showcase: Story = {
  name: 'showcase · all variants',
  render: () => (
    <div class="flex flex-col gap-3">
      <Typography variant="h1">H1 — page title</Typography>
      <Typography variant="h2">H2 — section heading</Typography>
      <Typography variant="h3">H3 — subsection heading</Typography>
      <Typography variant="lead">
        Lead paragraph — usually muted, larger size, intro to the section.
      </Typography>
      <Typography variant="p">
        Regular body text. Set <Typography variant="code">color="muted"</Typography> for secondary
        copy.
      </Typography>
      <Typography variant="p" color="muted">
        Muted body — for hints and metadata.
      </Typography>
      <Typography variant="p" color="primary">
        Primary-coloured callout.
      </Typography>
      <Typography variant="p" color="destructive">
        Destructive-coloured warning.
      </Typography>
      <Typography variant="blockquote">A wise quote in italic with a left border.</Typography>
      <Typography variant="muted">
        Muted hint — helper text, secondary annotations, timestamps.
      </Typography>
    </div>
  ),
};

// ─── New presentational props ────────────────────────────────────────────────

export const AlignProps: Story = {
  name: 'align — start | center | end',
  render: () => (
    <div class="flex flex-col gap-3">
      <Typography variant="p" align="start">
        align="start" — text aligned left (default)
      </Typography>
      <Typography variant="p" align="center">
        align="center" — text centered
      </Typography>
      <Typography variant="p" align="end">
        align="end" — text aligned right
      </Typography>
    </div>
  ),
};

export const ToneProps: Story = {
  name: 'tone — default | muted | destructive | primary',
  render: () => (
    <div class="flex flex-col gap-2">
      <Typography variant="p" tone="default">
        tone="default" → text-foreground
      </Typography>
      <Typography variant="p" tone="muted">
        tone="muted" → text-muted-foreground
      </Typography>
      <Typography variant="p" tone="destructive">
        tone="destructive" → text-destructive
      </Typography>
      <Typography variant="p" tone="primary">
        tone="primary" → text-primary
      </Typography>
    </div>
  ),
};

export const SizeOverride: Story = {
  name: 'size — override variant font-size',
  render: () => (
    <div class="flex flex-col gap-2">
      <Typography variant="p" size="xs">
        size="xs" — text-xs
      </Typography>
      <Typography variant="p" size="sm">
        size="sm" — text-sm
      </Typography>
      <Typography variant="p" size="base">
        size="base" — text-base
      </Typography>
      <Typography variant="p" size="lg">
        size="lg" — text-lg
      </Typography>
      <Typography variant="p" size="xl">
        size="xl" — text-xl
      </Typography>
      <Typography variant="p" size="2xl">
        size="2xl" — text-2xl
      </Typography>
      <Typography variant="h2" size="sm">
        h2 variant but size="sm" (override)
      </Typography>
    </div>
  ),
};

export const DimProp: Story = {
  name: 'dim — fade without removing from DOM',
  render: () => (
    <div class="flex flex-col gap-3">
      <Typography variant="p" dim={false}>
        dim=false — fully visible (opacity-100)
      </Typography>
      <Typography variant="p" dim>
        dim=true — visually hidden (opacity-0), space reserved
      </Typography>
      <Typography variant="p" tone="destructive" dim={false}>
        Error message visible
      </Typography>
      <Typography variant="p" tone="destructive" dim>
        Error message hidden (preserves layout)
      </Typography>
    </div>
  ),
};

export const ErrorFadePattern: Story = {
  name: 'error fade pattern (loginForm use-case)',
  render: () => {
    const hasError = false;
    return (
      <div class="flex min-h-6 items-center justify-center">
        <Typography variant="p" size="sm" tone="destructive" dim={!hasError}>
          Неверный логин или пароль
        </Typography>
      </div>
    );
  },
};
