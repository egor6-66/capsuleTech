import type { Meta, StoryObj } from 'storybook-solidjs-vite';

import { Button } from '../button';
import { Input } from '../input';
import { Field } from '.';

const meta = {
  title: 'Components/Field',
  component: Field,
  tags: ['autodocs'],
  argTypes: {
    orientation: {
      control: 'inline-radio',
      options: ['vertical', 'horizontal', 'responsive'],
    },
  },
  decorators: [
    (Story) => (
      <div class="max-w-md p-4">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Field>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Field orientation="vertical">
      <Field.Label>Email</Field.Label>
      <Input type="email" placeholder="you@example.com" />
      <Field.Description>We'll never share your email.</Field.Description>
    </Field>
  ),
};

export const Horizontal: Story = {
  render: () => (
    <Field orientation="horizontal">
      <Field.Label>Username</Field.Label>
      <Input placeholder="capsule_user" />
    </Field>
  ),
};

export const WithError: Story = {
  render: () => (
    <Field orientation="vertical">
      <Field.Label>Email</Field.Label>
      <Input type="email" value="not-an-email" />
      <Field.Error errors={[{ message: 'Invalid email format.' }]} />
    </Field>
  ),
};

export const MultipleErrors: Story = {
  render: () => (
    <Field orientation="vertical">
      <Field.Label>Password</Field.Label>
      <Input type="password" />
      <Field.Error
        errors={[
          { message: 'Must be at least 8 characters.' },
          { message: 'Must contain a digit.' },
          { message: 'Must contain a special character.' },
        ]}
      />
    </Field>
  ),
};

export const Group: Story = {
  name: 'group of fields',
  render: () => (
    <Field.Group>
      <Field>
        <Field.Label>First name</Field.Label>
        <Input placeholder="Ada" />
      </Field>
      <Field>
        <Field.Label>Last name</Field.Label>
        <Input placeholder="Lovelace" />
      </Field>
      <Field>
        <Field.Label>Email</Field.Label>
        <Input type="email" placeholder="ada@example.com" />
        <Field.Description>We'll use this for account recovery.</Field.Description>
      </Field>
      <div class="flex justify-end pt-2">
        <Button>Save</Button>
      </div>
    </Field.Group>
  ),
};

export const SetWithLegend: Story = {
  name: 'fieldset + legend',
  render: () => (
    <Field.Set>
      <Field.Legend>Notification preferences</Field.Legend>
      <Field.Group>
        <Field orientation="horizontal">
          <Field.Label>Newsletter</Field.Label>
          <Input type="text" placeholder="frequency" />
        </Field>
        <Field orientation="horizontal">
          <Field.Label>Marketing</Field.Label>
          <Input type="text" placeholder="frequency" />
        </Field>
      </Field.Group>
    </Field.Set>
  ),
};

export const SeparatorWithLabel: Story = {
  name: 'separator with label',
  render: () => (
    <Field.Group>
      <Field>
        <Field.Label>Email</Field.Label>
        <Input type="email" placeholder="you@example.com" />
      </Field>
      <Field.Separator>or continue with</Field.Separator>
      <Field>
        <Field.Label>SSO provider</Field.Label>
        <Input placeholder="github / google / …" />
      </Field>
    </Field.Group>
  ),
};
