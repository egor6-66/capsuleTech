import type { Meta, StoryObj } from 'storybook-solidjs-vite';

import { Launcher } from '.';

const ITEMS = [
  { id: 'lessons', label: 'Уроки', description: 'Пошаговые материалы' },
  { id: 'exercises', label: 'Упражнения', description: 'Практика с прогрессом' },
  { id: 'library', label: 'Библиотека', description: 'Справочник и коллекции' },
];

const meta = {
  title: 'ComponentsPalette/Launcher',
  component: Launcher,
  tags: ['autodocs'],
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof Launcher>;

export default meta;
type Story = StoryObj<typeof meta>;

// Полный hero (title + description + hint) + грид карточек.
export const Default: Story = {
  render: () => (
    <div class="h-[600px]">
      <Launcher
        items={ITEMS}
        title="Обучение"
        description="Выбери раздел, чтобы начать"
        hint="Подсказка: наведи, кликни или нажми Enter"
        onSelect={() => {}}
      />
    </div>
  ),
};

// Без hero — только грид карточек.
export const NoHero: Story = {
  render: () => (
    <div class="h-[600px]">
      <Launcher items={ITEMS} onSelect={() => {}} />
    </div>
  ),
};
