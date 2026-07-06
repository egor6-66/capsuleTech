import { BookOpen, ScrollText } from 'lucide-solid';
import { createSignal } from 'solid-js';
import type { Meta, StoryObj } from 'storybook-solidjs-vite';

import { Typography } from '../../primitives/typography';
import type { ISectionedListSection } from './interfaces';
import { SectionedList } from './sectionedList';

const meta = {
  title: 'ComponentsPalette/SectionedList',
  component: SectionedList,
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div class="w-full max-w-sm p-8">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof SectionedList>;

export default meta;
type Story = StoryObj<typeof meta>;

const SECTIONS: ISectionedListSection[] = [
  {
    value: 'concepts',
    label: 'Понятия',
    subtitle: 'Ключевые сущности главы',
    icon: BookOpen,
    items: [
      { id: 'uiproxy', label: 'UiProxy' },
      { id: 'bridge', label: 'Bridge' },
      { id: 'controller-proxy', label: 'ControllerProxy' },
    ],
  },
  {
    value: 'rules',
    label: 'Правила',
    subtitle: 'Golden Rules слоёв',
    icon: ScrollText,
    items: [
      { id: 'no-upward', label: 'No upward imports' },
      { id: 'stateless-view', label: 'Stateless View' },
      { id: 'compose-widget', label: 'Composition only in Widgets' },
    ],
  },
];

/**
 * Default — studio-look accordion (no borders/boxes), a subtitle stack per
 * section header, and a highlighted selected row. Click a row to move the
 * selection.
 */
export const Default: Story = {
  render: () => {
    const [selected, setSelected] = createSignal<string>('uiproxy');
    return (
      <SectionedList
        sections={SECTIONS}
        selectedId={selected()}
        onSelect={setSelected}
        defaultOpen="all"
      />
    );
  },
};

/**
 * `defaultOpen={['concepts']}` — only the first section starts open; the second
 * expands on click (uncontrolled internal state).
 */
export const SingleOpen: Story = {
  render: () => {
    const [selected, setSelected] = createSignal<string>('no-upward');
    return (
      <SectionedList
        sections={SECTIONS}
        selectedId={selected()}
        onSelect={setSelected}
        defaultOpen={['concepts']}
      />
    );
  },
};

/**
 * `itemPreview` — on hover each row shows a Tooltip with a live preview (here a
 * short definition). The consumer supplies only the content; the kit owns the
 * Tooltip composition.
 */
export const WithItemPreview: Story = {
  render: () => {
    const [selected, setSelected] = createSignal<string>('uiproxy');
    const defs: Record<string, string> = {
      uiproxy: 'Оборачивает UI-kit при рендере внутри контроллера — биндинг событий + meta.',
      bridge: 'Реактивная обёртка вокруг XState state/send + tag-операции.',
      'controller-proxy': 'Читает текущий стейт из XState, маршрутизирует хендлеры.',
      'no-upward': 'Нижний слой не импортирует верхний.',
      'stateless-view': 'View без состояния — только Solid JSX и типы.',
      'compose-widget': 'Склеивать View/Controller можно только в Widget.',
    };
    return (
      <SectionedList
        sections={SECTIONS}
        selectedId={selected()}
        onSelect={setSelected}
        defaultOpen="all"
        itemPreview={(id) => (
          <div class="max-w-xs p-3">
            <Typography size="sm">{defs[id] ?? id}</Typography>
          </div>
        )}
      />
    );
  },
};

/**
 * Controlled open — the parent owns the expanded set via `open`/`onOpenChange`.
 */
export const ControlledOpen: Story = {
  render: () => {
    const [open, setOpen] = createSignal<string[]>(['rules']);
    const [selected, setSelected] = createSignal<string>('stateless-view');
    return (
      <SectionedList
        sections={SECTIONS}
        selectedId={selected()}
        onSelect={setSelected}
        open={open()}
        onOpenChange={setOpen}
      />
    );
  },
};
