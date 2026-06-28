/**
 * Learn.LessonView — урок целиком (concept + тело + связанные упражнения).
 * SKELETON: плейсхолдер. Реальный рендер concept'а — следующая итерация.
 */
import { Typography } from '@capsuletech/web-ui/typography';
import type { Component } from 'solid-js';

export interface ILessonViewProps {
  conceptId: string;
}

export const LessonView: Component<ILessonViewProps> = (props) => (
  <div data-stub="Learn.LessonView">
    <Typography variant="h2">LessonView</Typography>
    <Typography tone="muted">concept: {props.conceptId}</Typography>
  </div>
);
