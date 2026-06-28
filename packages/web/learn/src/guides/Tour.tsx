/** Learn.Tour — пошаговый гайд по интерфейсу. SKELETON: плейсхолдер. */
import { Typography } from '@capsuletech/web-ui/typography';
import type { Component } from 'solid-js';

export interface ITourProps {
  guideId?: string;
}

export const Tour: Component<ITourProps> = (props) => (
  <div data-stub="Learn.Tour">
    <Typography tone="muted">tour: {props.guideId ?? '—'}</Typography>
  </div>
);
