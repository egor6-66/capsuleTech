/**
 * Learn.Concept — карточка одного концепта (заголовок + TS-аналогия + тело).
 * SKELETON: плейсхолдер.
 */
import { Typography } from '@capsuletech/web-ui/typography';
import type { Component } from 'solid-js';

export interface IConceptProps {
  id: string;
  title?: string;
}

export const Concept: Component<IConceptProps> = (props) => (
  <div data-stub="Learn.Concept">
    <Typography variant="h2">{props.title ?? props.id}</Typography>
  </div>
);
