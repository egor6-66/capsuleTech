/**
 * <Can cap="..."> — гейт-обёртка: рендерит children, если `can(cap)`.
 * Опциональный fallback. Реактивно (Show + реактивный can).
 */

import { Show } from 'solid-js';
import { can } from './resolver';
import type { ICanProps } from './types';

export const Can = (props: ICanProps) => (
  <Show when={can(props.cap)} fallback={props.fallback}>
    {props.children}
  </Show>
);
