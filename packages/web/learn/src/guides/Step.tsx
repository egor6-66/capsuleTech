/** Learn.Step — один шаг тура. SKELETON: плейсхолдер. */
import { Typography } from '@capsuletech/web-ui/typography';
import type { Component } from 'solid-js';

export interface IStepProps {
  index?: number;
  label?: string;
}

export const Step: Component<IStepProps> = (props) => (
  <div data-stub="Learn.Step">
    <Typography tone="muted">{props.label ?? `step ${props.index ?? 0}`}</Typography>
  </div>
);
