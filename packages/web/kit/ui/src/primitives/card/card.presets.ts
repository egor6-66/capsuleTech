/**
 * Card presets — именованные варианты Card-композиции для палитры студио.
 *
 * Каждый preset — JSON-схема для Renderer'а (`@capsuletech/web-renderer`);
 * палитра рендерит превью через `<Renderer schema mode="static" />`.
 *
 * Card — композиция: суть в наборе и порядке частей (Header → Title/Description,
 * Content, Footer). Поэтому пресеты — многоуровневые деревья из `ui.Card.*`
 * частей, наполненные текстом (Title/Description — строковый `children`) и
 * контентом (Typography / Button в Content / Footer).
 */

import type { IEditorNode } from '@capsuletech/web-contract';
import type { IPreset } from '../../manifest/types';

/** Декларативная нода-спека — компилируется в плоскую {root, nodes} карту. */
type NodeSpec = { type: string; props?: Record<string, unknown>; children?: NodeSpec[] };

/** Плоская карта нод из вложенной спеки. Id детерминированы по пути (`n` → `n-0` → `n-0-1`). */
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

export const cardPresets: readonly IPreset[] = [
  {
    id: 'basic',
    label: 'Basic',
    schema: buildSchema({
      type: 'ui.Card',
      children: [
        {
          type: 'ui.Card.Header',
          children: [
            { type: 'ui.Card.Title', props: { children: 'Заголовок карточки' } },
            {
              type: 'ui.Card.Description',
              props: { children: 'Короткое описание под заголовком.' },
            },
          ],
        },
        {
          type: 'ui.Card.Content',
          children: [
            {
              type: 'ui.Typography',
              props: {
                variant: 'p',
                children: 'Основной контент карточки — текст, поля, любые блоки.',
              },
            },
          ],
        },
      ],
    }),
    description:
      'Базовая карточка: шапка (заголовок + описание) и контент. Дефолт для блоков дашборда, форм, информационных секций.',
  },
  {
    id: 'with-footer',
    label: 'With footer',
    schema: buildSchema({
      type: 'ui.Card',
      children: [
        {
          type: 'ui.Card.Header',
          children: [
            { type: 'ui.Card.Title', props: { children: 'Подтверждение' } },
            { type: 'ui.Card.Description', props: { children: 'Действие нельзя отменить.' } },
          ],
        },
        {
          type: 'ui.Card.Content',
          children: [
            {
              type: 'ui.Typography',
              props: { variant: 'muted', children: 'Вы уверены, что хотите продолжить?' },
            },
          ],
        },
        {
          type: 'ui.Card.Footer',
          children: [
            { type: 'ui.Button', props: { variant: 'secondary', children: 'Отмена' } },
            { type: 'ui.Button', props: { variant: 'default', children: 'Продолжить' } },
          ],
        },
      ],
    }),
    description:
      'Карточка с футером действий — для диалогов-подтверждений, форм с кнопками submit/cancel, карточек с CTA внизу.',
  },
  {
    id: 'stat',
    label: 'Stat',
    schema: buildSchema({
      type: 'ui.Card',
      children: [
        {
          type: 'ui.Card.Content',
          children: [
            {
              type: 'ui.Typography',
              props: { variant: 'muted', children: 'Активные пользователи' },
            },
            { type: 'ui.Typography', props: { variant: 'h2', children: '12 480' } },
          ],
        },
      ],
    }),
    description:
      'Метрика без шапки — подпись + крупное число. Для KPI-плиток, сводок дашборда, статистических виджетов.',
  },
  // ─── Entity presets (data-driven mode) ──────────────────────────────────
  // Single `ui.Card` node whose entity slots carry serializable sample data.
  // Same entity, different slot-completeness — not different markup.
  {
    id: 'word-compact',
    label: 'Word (compact)',
    schema: buildSchema({
      type: 'ui.Card',
      props: {
        title: 'cat',
        titleAction: '🔊',
        subtitle: '/kæt/',
        translation: 'кошка',
        align: 'center',
        interactive: true,
      },
    }),
    description:
      'Компактная карточка слова: заголовок + озвучка + транскрипция + перевод, по центру, кликабельна. Для плиток словаря.',
  },
  {
    id: 'word-full',
    label: 'Word (full)',
    schema: buildSchema({
      type: 'ui.Card',
      props: {
        title: 'cat',
        titleAction: '🔊',
        subtitle: '/kæt/',
        translation: 'кошка',
        definition: 'a small domesticated carnivorous mammal',
        tags: ['noun', 'A1', 'animals'],
        meta: [
          { key: 'часть речи', value: 'существительное' },
          { key: 'частота', value: 'высокая' },
        ],
        align: 'start',
      },
    }),
    description:
      'Полная карточка слова: тот же пресет, но с определением, тегами и фасетами. «Урезано где-то» = те же слоты, часть погашена.',
  },
  {
    id: 'entity-meta',
    label: 'Entity (meta)',
    schema: buildSchema({
      type: 'ui.Card',
      props: {
        title: 'Present Simple',
        badge: 'A2',
        tags: ['grammar', 'tense'],
        interactive: true,
      },
    }),
    description:
      'Карточка сущности с одиночным бейджем (уровень) и тегами, кликабельна. Для карточек уроков / каталожных строк.',
  },
];
