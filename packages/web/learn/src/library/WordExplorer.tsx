/**
 * Learn.WordExplorer — explorer-вью словаря: поиск слова + карточка + связи.
 *
 * SKELETON: stateless плейсхолдер на web-ui примитивах (поиск disabled,
 * тоггл-чипы связей, empty-state). Реальный поиск/данные — с backend/learn
 * через web-query (последующая итерация).
 */
import { Input } from '@capsuletech/web-ui/input';
import { Layout } from '@capsuletech/web-ui/layout';
import { Toggle } from '@capsuletech/web-ui/toggle';
import { Typography } from '@capsuletech/web-ui/typography';
import { For } from 'solid-js';

const RELATION_FILTERS = ['Synonyms', 'Constructions', 'Phonetics', 'Related'] as const;

export interface IWordExplorerProps {
  class?: string;
}

export const WordExplorer = (props: IWordExplorerProps) => (
  <Layout.Flex
    orientation="vertical"
    gapY={4}
    class={`min-h-full ${props.class ?? ''}`}
    data-stub="Learn.WordExplorer"
  >
    <Input placeholder="Найти слово…" disabled />

    <Layout.Flex orientation="horizontal" gapX={2} wrap="wrap">
      <For each={RELATION_FILTERS}>{(label) => <Toggle label={label} disabled />}</For>
    </Layout.Flex>

    <Layout.Flex orientation="vertical" align="center" justify="center" gapY={2} class="py-16">
      <Typography variant="h2">Word Explorer</Typography>
      <Typography tone="muted" align="center">
        Введите слово, чтобы увидеть карточку, связи и фонетику.
      </Typography>
    </Layout.Flex>
  </Layout.Flex>
);
