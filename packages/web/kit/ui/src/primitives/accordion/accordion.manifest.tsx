import { z } from '@capsuletech/shared-zod';
import type { IEditorNode } from '@capsuletech/web-contract';
import { AlignJustify, ChevronsUpDown, Heading1, Rows3 } from '../../icons';
import type { IPreset, IPrimitiveManifestEntry } from '../../manifest/types';

/** Nested node-spec → flat `{ root, nodes }` schema (ids derived by path). */
type NodeSpec = { type: string; props?: Record<string, unknown>; children?: NodeSpec[] };
const buildSchema = (spec: NodeSpec): IPreset['schema'] => {
  const nodes: Record<string, IEditorNode> = {};
  const walk = (s: NodeSpec, id: string, parentId: string | null): void => {
    const childIds = (s.children ?? []).map((_, i) => `${id}-${i}`);
    nodes[id] = {
      id,
      type: s.type,
      parentId,
      children: childIds,
      ...(s.props ? { props: s.props } : {}),
    };
    (s.children ?? []).forEach((c, i) => {
      walk(c, childIds[i], id);
    });
  };
  walk(spec, 'n', null);
  return { components: { root: 'n', nodes } };
};

/** A section: Item → Trigger(label[, subtitle]) → Content(text). */
const section = (value: string, label: string, body: string, subtitle?: string): NodeSpec => ({
  type: 'ui.Accordion.Item',
  props: { value },
  children: [
    {
      type: 'ui.Accordion.Trigger',
      props: { children: label, ...(subtitle ? { subtitle } : {}) },
    },
    {
      type: 'ui.Accordion.Content',
      children: [{ type: 'ui.Typography', props: { variant: 'muted', children: body } }],
    },
  ],
});

const ACCORDION_DIRECT_CHILD = 'ui.Accordion.Item';
const isAccordionPart = (type: string) => type.startsWith('ui.Accordion.');

const accordionPresets: readonly IPreset[] = [
  {
    id: 'plain',
    label: 'Plain',
    schema: buildSchema({
      type: 'ui.Accordion',
      props: { multiple: true },
      children: [
        section('a', 'Раздел A', 'Содержимое первого раздела.'),
        section('b', 'Раздел B', 'Содержимое второго раздела.'),
      ],
    }),
    description:
      'Базовый аккордеон: несколько независимо раскрываемых секций без рамок. Дефолт для FAQ, справочников, группировки настроек.',
  },
  {
    id: 'segmented',
    label: 'Segmented',
    schema: buildSchema({
      type: 'ui.Accordion',
      props: { preset: 'segmented' },
      children: [
        section('primitives', 'Примитивы', 'Кнопки, поля, типографика.'),
        section('layout', 'Раскладка', 'Grid, Flex, Matrix.'),
      ],
    }),
    description:
      'Studio-палитра: рамка + multiple-open + компактные триггеры. Для плотных списков-каталогов компонентов.',
  },
  {
    id: 'subtitle',
    label: 'With subtitle',
    schema: buildSchema({
      type: 'ui.Accordion',
      props: { multiple: true },
      children: [
        section(
          'uiproxy',
          'UiProxy',
          'Оборачивает UI-kit при рендере внутри контроллера.',
          'Поток событий View → Controller',
        ),
        section(
          'bridge',
          'Bridge',
          'Реактивная обёртка вокруг XState state/send.',
          'Реактивные чтения + tag-операции',
        ),
      ],
    }),
    description:
      'Заголовок группы «title + приглушённый подзаголовок» (колоночный стек). Для справочников понятий/правил, где под именем нужна короткая пометка.',
  },
];

export const AccordionManifest: IPrimitiveManifestEntry = {
  type: 'ui.Accordion',
  label: 'Аккордеон',
  category: 'composition',
  icon: () => <ChevronsUpDown size={16} />,
  description: 'Контейнер из раскрываемых секций (несколько или по одной)',
  accepts: (childType) => childType === ACCORDION_DIRECT_CHILD,
  canBeRoot: true,
  docSlug: 'web-ui/primitives/accordion',
  defaultProps: {
    multiple: true,
  },
  styleSlots: ['root'],
  propsSchema: z.object({
    multiple: z.boolean().optional(),
    collapsible: z.boolean().optional(),
    bordered: z.boolean().optional(),
    rounded: z.boolean().optional(),
    nested: z.boolean().optional(),
    density: z.enum(['default', 'compact']).optional(),
    preset: z.enum(['segmented']).optional(),
    class: z.string().optional(),
  }),
  presets: accordionPresets,
};

export const AccordionItemManifest: IPrimitiveManifestEntry = {
  type: 'ui.Accordion.Item',
  label: 'Секция аккордеона',
  category: 'composite',
  icon: () => <Rows3 size={16} />,
  accepts: (childType) =>
    childType === 'ui.Accordion.Trigger' || childType === 'ui.Accordion.Content',
  defaultProps: { value: 'section' },
  propsSchema: z.object({
    value: z.string().default('section'),
    disabled: z.boolean().optional(),
    class: z.string().optional(),
  }),
};

export const AccordionTriggerManifest: IPrimitiveManifestEntry = {
  type: 'ui.Accordion.Trigger',
  label: 'Заголовок секции',
  category: 'composite',
  icon: () => <Heading1 size={16} />,
  isLeaf: true,
  defaultProps: { children: 'Раздел' },
  propsSchema: z.object({
    children: z.string().default('Раздел'),
    /** Optional muted caption under the label → renders a title/caption stack. */
    subtitle: z.string().optional(),
    class: z.string().optional(),
  }),
};

export const AccordionContentManifest: IPrimitiveManifestEntry = {
  type: 'ui.Accordion.Content',
  label: 'Содержимое секции',
  category: 'composite',
  icon: () => <AlignJustify size={16} />,
  accepts: (childType) => !isAccordionPart(childType),
  defaultProps: {},
  propsSchema: z.object({
    class: z.string().optional(),
  }),
};
