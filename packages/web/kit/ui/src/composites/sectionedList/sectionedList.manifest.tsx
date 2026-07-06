import { z } from '@capsuletech/shared-zod';
import type { IEditorNode } from '@capsuletech/web-contract';
import { ListTree } from '../../icons';
import type { IPreset, IPrimitiveManifestEntry } from '../../manifest/types';

/** Serializable sample — `label`s are plain strings (store is JSON). */
const SAMPLE_SECTIONS = [
  {
    value: 'concepts',
    label: 'Понятия',
    subtitle: 'Ключевые сущности главы',
    items: [
      { id: 'uiproxy', label: 'UiProxy' },
      { id: 'bridge', label: 'Bridge' },
    ],
  },
  {
    value: 'rules',
    label: 'Правила',
    subtitle: 'Golden Rules слоёв',
    items: [
      { id: 'no-upward', label: 'No upward imports' },
      { id: 'stateless-view', label: 'Stateless View' },
    ],
  },
];

/** Single-node schema for the palette preview (`<Renderer static>`). */
const singleNode = (props: Record<string, unknown>): IPreset['schema'] => {
  const node: IEditorNode = {
    id: 'n',
    type: 'ui.SectionedList',
    parentId: null,
    children: [],
    props,
  };
  return { components: { root: 'n', nodes: { n: node } } };
};

const itemSchema = z.object({
  id: z.string(),
  label: z.string(),
});

const sectionSchema = z.object({
  value: z.string(),
  label: z.string(),
  subtitle: z.string().optional(),
  items: z.array(itemSchema),
});

export const SectionedListManifest: IPrimitiveManifestEntry = {
  type: 'ui.SectionedList',
  label: 'Секционный список',
  category: 'composite',
  icon: () => <ListTree size={16} />,
  description: 'Аккордеон групп → выбираемый список (справочник, палитра компонентов)',
  isLeaf: true,
  canBeRoot: true,
  defaultProps: {
    sections: SAMPLE_SECTIONS,
  },
  styleSlots: ['root'],
  propsSchema: z.object({
    // `sections` — data only; `label`/`subtitle` as strings for the inspector
    // (runtime accepts JSX). `onSelect`/`itemPreview`/`defaultOpen` are
    // runtime-only handlers and intentionally absent from the schema.
    sections: z.array(sectionSchema),
    selectedId: z.string().nullable().optional(),
    open: z.array(z.string()).optional(),
    class: z.string().optional(),
  }),
  presets: [
    {
      id: 'reference',
      label: 'Reference',
      schema: singleNode({ sections: SAMPLE_SECTIONS, open: ['concepts'] }),
      description:
        'Справочник главы: секции «Понятия»/«Правила» с подзаголовками и выбираемыми строками. Для learn Concepts/Rules и studio-палитры.',
    },
  ],
};
