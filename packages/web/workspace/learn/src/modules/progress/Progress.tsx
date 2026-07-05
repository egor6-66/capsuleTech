/**
 * Learn.Progress — сводка прогресса по концептам (Leitner-боксы).
 * SKELETON: плейсхолдер.
 */
import { Typography } from '@capsuletech/web-ui/typography';
import type { Component } from 'solid-js';
import type { IProgressEntry } from '../../core';

export interface IProgressProps {
  entries?: IProgressEntry[];
}

export const Progress: Component<IProgressProps> = (props) => (
  <div data-stub="Learn.Progress">
    <Typography variant="h2">Progress</Typography>
    <Typography tone="muted">entries: {props.entries?.length ?? 0}</Typography>
  </div>
);
