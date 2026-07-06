import { z } from '@capsuletech/shared-zod';
import type { IEditorNode } from '@capsuletech/web-contract';
import { FileText } from '../../icons';
import type { IPreset, IPrimitiveManifestEntry } from '../../manifest/types';

/** Serializable sample — all text slots are plain strings (store is JSON). */
const SAMPLE_ARTICLE = {
  title: 'UiProxy',
  lead: 'UI — тень логики: интерфейс это немая проекция контроллера.',
  examples: [
    { primary: 'meta opt-in', secondary: 'Побочные эффекты только при явном meta.' },
    { primary: 'onCleanup', secondary: 'Регистрация снимается при размонтаже узла.' },
  ],
  related: [
    { id: 'no-upward', label: 'No upward imports' },
    { id: 'stateless-view', label: 'Stateless View' },
  ],
  relatedLabel: 'Смотри правила',
};

/** Single-node schema for the palette preview (`<Renderer static>`). */
const singleNode = (props: Record<string, unknown>): IPreset['schema'] => {
  const node: IEditorNode = {
    id: 'n',
    type: 'ui.Article',
    parentId: null,
    children: [],
    props,
  };
  return { components: { root: 'n', nodes: { n: node } } };
};

const exampleSchema = z.object({
  primary: z.string(),
  secondary: z.string().optional(),
});

const relatedSchema = z.object({
  id: z.string(),
  label: z.string(),
});

export const ArticleManifest: IPrimitiveManifestEntry = {
  type: 'ui.Article',
  label: 'Статья',
  category: 'composite',
  icon: () => <FileText size={16} />,
  description: 'Статья: заголовок + лид + markdown-тело + примеры + связанные-чипы',
  isLeaf: true,
  canBeRoot: true,
  defaultProps: {
    title: SAMPLE_ARTICLE.title,
    lead: SAMPLE_ARTICLE.lead,
  },
  styleSlots: ['root'],
  propsSchema: z.object({
    // Text slots as strings for the inspector (runtime accepts JSX). `body` and
    // `onRelatedSelect` are runtime-only and intentionally absent from the
    // schema (a rendered node / a callback are not serializable).
    title: z.string().optional(),
    lead: z.string().optional(),
    examples: z.array(exampleSchema).optional(),
    related: z.array(relatedSchema).optional(),
    relatedLabel: z.string().optional(),
    class: z.string().optional(),
  }),
  presets: [
    {
      id: 'concept',
      label: 'Concept',
      schema: singleNode(SAMPLE_ARTICLE),
      description:
        'Статья-понятие: заголовок + лид + примеры-карточки + чипы связанных правил. Для learn Concept и справочных страниц.',
    },
  ],
};
