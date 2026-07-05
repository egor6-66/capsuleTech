/**
 * LessonCard — один item-шаблон списка уроков (internal building-block `List`,
 * отдельно НЕ регистрируется). Card interactive/selected + title + level-бейдж +
 * tags-бейджи. Извлечён из `List` под batch-режим `Ui.List` (`item.use`).
 *
 * Бейджи — `Ui.Badge tone="muted"` (дедуп хендролл-пилюль, канон product-wide
 * kit layering): level = лейбл, теги = `#{tag}` (тот же вид, что в `Library.Info`).
 * `#`-префикс — контент потребителя, не забота Badge.
 */
import { Badge } from '@capsuletech/web-ui/badge';
import { Card } from '@capsuletech/web-ui/card';
import { Layout } from '@capsuletech/web-ui/layout';
import { Typography } from '@capsuletech/web-ui/typography';
import { For, Show } from 'solid-js';
import type { ILessonSummary } from './types';

export interface ILessonCardProps {
  lesson: ILessonSummary;
  selected: boolean;
  onSelect: (id: string) => void;
}

export const LessonCard = (props: ILessonCardProps) => (
  <Card
    role="button"
    tabIndex={0}
    interactive
    selected={props.selected}
    padding="sm"
    onClick={() => props.onSelect(props.lesson.id)}
  >
    <Layout.Flex orientation="vertical" gapY={1}>
      <Layout.Flex orientation="horizontal" gapX={2} align="center">
        <Typography>{props.lesson.title}</Typography>
        <Show when={props.lesson.level}>
          <Badge tone="muted">{props.lesson.level}</Badge>
        </Show>
      </Layout.Flex>

      <Show when={props.lesson.tags.length > 0}>
        <Layout.Flex orientation="horizontal" gapX={1} gapY={1} wrap="wrap">
          <For each={props.lesson.tags}>{(tag) => <Badge tone="muted">#{tag}</Badge>}</For>
        </Layout.Flex>
      </Show>
    </Layout.Flex>
  </Card>
);

export default LessonCard;
