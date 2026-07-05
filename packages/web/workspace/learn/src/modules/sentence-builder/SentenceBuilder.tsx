/**
 * Learn.SentenceBuilder — конструктор предложения из слов-чипов.
 * SKELETON: плейсхолдер; DnD-механика — следующая итерация.
 */
import { Typography } from '@capsuletech/web-ui/typography';
import type { Component } from 'solid-js';

export interface ISentenceBuilderProps {
  words?: string[];
}

export const SentenceBuilder: Component<ISentenceBuilderProps> = (props) => (
  <div data-stub="Learn.SentenceBuilder">
    <Typography tone="muted">words: {props.words?.length ?? 0}</Typography>
  </div>
);
