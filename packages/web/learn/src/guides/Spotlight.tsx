/** Learn.Spotlight — подсветка целевого элемента в туре. SKELETON: плейсхолдер. */
import type { Component } from 'solid-js';

export interface ISpotlightProps {
  targetId?: string;
}

export const Spotlight: Component<ISpotlightProps> = (props) => (
  <div data-stub="Learn.Spotlight" data-target={props.targetId} />
);
