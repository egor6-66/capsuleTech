/**
 * Learn.VocabList — список словарных единиц. SKELETON: плейсхолдер.
 */
import { Typography } from '@capsuletech/web-ui/typography';
import type { Component } from 'solid-js';

export interface IVocabListProps {
  words?: string[];
}

export const VocabList: Component<IVocabListProps> = (props) => (
  <div data-stub="Learn.VocabList">
    <Typography tone="muted">words: {props.words?.length ?? 0}</Typography>
  </div>
);
