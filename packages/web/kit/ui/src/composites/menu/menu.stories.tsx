import { Menu as MenuIcon } from 'lucide-solid';
import { createSignal } from 'solid-js';
import type { Meta, StoryObj } from 'storybook-solidjs-vite';

import { Button } from '../../primitives/button';
import { Menu } from './menu';

const meta = {
  title: 'Composites/Menu',
  component: Menu.Dropdown,
  tags: ['autodocs'],
  decorators: [
    (Story: () => import('solid-js').JSX.Element) => (
      <div class="flex min-h-72 items-start justify-center p-8">{Story()}</div>
    ),
  ],
} satisfies Meta<typeof Menu.Dropdown>;

export default meta;
type Story = StoryObj<typeof meta>;

const trigger = (label: string) => <Button variant="outline">{label}</Button>;

// ---------------------------------------------------------------------------
// Basic — action items + separator + label
// ---------------------------------------------------------------------------

export const Basic: Story = {
  name: 'basic · actions',
  render: () => (
    <Menu.Dropdown
      trigger={trigger('Account')}
      items={[
        { type: 'label', id: 'h', label: 'Аккаунт' },
        { type: 'action', id: 'profile', icon: 'user', label: 'Профиль' },
        { type: 'action', id: 'settings', icon: 'settings', label: 'Настройки' },
        { type: 'separator', id: 's' },
        { type: 'action', id: 'logout', icon: 'log-out', label: 'Выйти' },
      ]}
    />
  ),
};

// ---------------------------------------------------------------------------
// Toggles — controlled switch rows
// ---------------------------------------------------------------------------

export const Toggles: Story = {
  name: 'toggles · controlled',
  render: () => {
    const [dark, setDark] = createSignal(false);
    const [glass, setGlass] = createSignal(true);
    return (
      <Menu.Dropdown
        trigger={trigger('Оформление')}
        items={[
          { type: 'label', id: 'h', label: 'Оформление' },
          {
            type: 'toggle',
            id: 'dark',
            icon: 'moon',
            label: 'Тёмная',
            checked: dark(),
            onChange: setDark,
          },
          {
            type: 'toggle',
            id: 'glass',
            icon: 'sparkles',
            label: 'Глэс',
            checked: glass(),
            onChange: setGlass,
          },
        ]}
      />
    );
  },
};

// ---------------------------------------------------------------------------
// Submenu — nested recursive items
// ---------------------------------------------------------------------------

export const Submenu: Story = {
  name: 'submenu · theme picker',
  render: () => (
    <Menu.Dropdown
      trigger={trigger('Тема')}
      items={[
        {
          type: 'submenu',
          id: 'theme',
          icon: 'palette',
          label: 'Тема',
          items: [
            { type: 'action', id: 'black', label: 'Чёрная' },
            { type: 'action', id: 'ocean', label: 'Океан' },
            { type: 'action', id: 'forest', label: 'Лес' },
          ],
        },
      ]}
    />
  ),
};

// ---------------------------------------------------------------------------
// Expandable — free-form render slot
// ---------------------------------------------------------------------------

export const Expandable: Story = {
  name: 'expandable · render slot',
  render: () => (
    <Menu.Dropdown
      trigger={trigger('Фон')}
      items={[
        {
          type: 'expandable',
          id: 'fon',
          icon: 'image',
          label: 'Фон',
          render: () => (
            <div class="p-3 text-sm text-muted-foreground">
              Произвольное тело панели — слайдеры, редакторы и т.п.
            </div>
          ),
        },
      ]}
    />
  ),
};

// ---------------------------------------------------------------------------
// Mixed — every item type in one icon-trigger dropdown (appearance-menu shape)
// ---------------------------------------------------------------------------

export const Mixed: Story = {
  name: 'mixed · all item types',
  render: () => {
    const [dark, setDark] = createSignal(false);
    return (
      <Menu.Dropdown
        trigger={
          <Button variant="ghost" size="icon">
            <MenuIcon class="size-4" />
          </Button>
        }
        items={[
          { type: 'label', id: 'h', label: 'Оформление' },
          {
            type: 'toggle',
            id: 'dark',
            icon: 'moon',
            label: 'Тёмная',
            checked: dark(),
            onChange: setDark,
          },
          {
            type: 'submenu',
            id: 'theme',
            icon: 'palette',
            label: 'Тема',
            items: [
              { type: 'action', id: 'black', label: 'Чёрная' },
              { type: 'action', id: 'ocean', label: 'Океан' },
            ],
          },
          {
            type: 'expandable',
            id: 'fon',
            icon: 'image',
            label: 'Фон',
            render: () => <div class="p-3 text-sm text-muted-foreground">Редактор фона…</div>,
          },
          { type: 'separator', id: 's' },
          { type: 'action', id: 'logout', icon: 'log-out', label: 'Выйти' },
        ]}
      />
    );
  },
};
