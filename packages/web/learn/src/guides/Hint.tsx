/** Learn.Hint — всплывающая подсказка тура. SKELETON: плейсхолдер. */
import { Typography } from '@capsuletech/web-ui/typography';
import type { Component } from 'solid-js';

export interface IHintProps {
  text?: string;
}

export const Hint: Component<IHintProps> = (props) => (
  <div data-stub="Learn.Hint">
    <Typography tone="muted">{props.text ?? ''}</Typography>
  </div>
);
