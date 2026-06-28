/**
 * Learn.TypeErrorBadge — бейдж TS-подобной ошибки в уроке grammar-as-types.
 * Имя компонента — TypeErrorBadge, чтобы не шадоуить global `TypeError`.
 * SKELETON: плейсхолдер.
 */
import { Typography } from '@capsuletech/web-ui/typography';
import type { Component } from 'solid-js';

export interface ITypeErrorProps {
  message: string;
}

export const TypeErrorBadge: Component<ITypeErrorProps> = (props) => (
  <div data-stub="Learn.TypeErrorBadge">
    <Typography tone="muted">{props.message}</Typography>
  </div>
);
