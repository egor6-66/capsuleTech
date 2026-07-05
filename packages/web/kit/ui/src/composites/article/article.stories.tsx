import type { Meta, StoryObj } from 'storybook-solidjs-vite';

import { Article } from '.';

const EXAMPLES = [
  { primary: 'meta opt-in', secondary: 'Побочные эффекты только при явном meta.' },
  { primary: 'onCleanup', secondary: 'Регистрация снимается при размонтаже узла.' },
];

const RELATED = [
  { id: 'no-upward', label: 'No upward imports' },
  { id: 'stateless-view', label: 'Stateless View' },
  { id: 'composition', label: 'Composition only in Widgets' },
];

const meta = {
  title: 'ComponentsPalette/Article',
  component: Article,
  tags: ['autodocs'],
  parameters: { layout: 'padded' },
} satisfies Meta<typeof Article>;

export default meta;
type Story = StoryObj<typeof meta>;

// Все слоты: заголовок + лид + тело + примеры + связанные-чипы.
export const Full: Story = {
  render: () => (
    <div class="max-w-2xl">
      <Article
        title="UiProxy"
        lead="UI — тень логики: интерфейс это немая проекция контроллера."
        body={
          <p class="text-sm leading-relaxed">
            Когда View рендерится внутри Controller, базовый UI-kit оборачивается в Proxy.
            Регистрация в store и event-binding активируются только для узлов с явным meta.
          </p>
        }
        examples={EXAMPLES}
        related={RELATED}
        relatedLabel="Смотри правила"
        onRelatedSelect={() => {}}
      />
    </div>
  ),
};

// Только заголовок + лид + тело (без примеров/связанных — пустые слоты скрыты).
export const TextOnly: Story = {
  render: () => (
    <div class="max-w-2xl">
      <Article
        title="Bridge"
        lead="Реактивная обёртка вокруг XState state/send."
        body={<p class="text-sm leading-relaxed">Solid ловит глубокие пути store.ctx.</p>}
      />
    </div>
  ),
};

// Только примеры-карточки.
export const ExamplesOnly: Story = {
  render: () => (
    <div class="max-w-2xl">
      <Article examples={EXAMPLES} />
    </div>
  ),
};

// Только ряд связанных-чипов с заголовком блока.
export const RelatedOnly: Story = {
  render: () => (
    <div class="max-w-2xl">
      <Article related={RELATED} relatedLabel="Смотри правила" onRelatedSelect={() => {}} />
    </div>
  ),
};
