/**
 * Learn.Collections — сохранённые списки/закладки словаря.
 * SKELETON: плейсхолдер; реальные коллекции — с backend/learn позже.
 */
import { Layout } from '@capsuletech/web-ui/layout';
import { Typography } from '@capsuletech/web-ui/typography';
import { VocabList } from './VocabList';

export interface ICollectionsProps {
  class?: string;
}

export const Collections = (props: ICollectionsProps) => (
  <Layout.Flex orientation="vertical" gapY={4} class={props.class} data-stub="Learn.Collections">
    <Typography variant="h2">Collections</Typography>
    <Typography tone="muted">Сохранённые списки и закладки.</Typography>
    <VocabList />
  </Layout.Flex>
);
