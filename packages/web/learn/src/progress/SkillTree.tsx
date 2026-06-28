/**
 * Learn.SkillTree — дерево навыков (unlocked-граф концептов).
 * SKELETON: плейсхолдер.
 */
import { Typography } from '@capsuletech/web-ui/typography';
import type { Component } from 'solid-js';
import type { ISkillNode } from '../core';

export interface ISkillTreeProps {
  root?: ISkillNode;
}

export const SkillTree: Component<ISkillTreeProps> = (props) => (
  <div data-stub="Learn.SkillTree">
    <Typography tone="muted">{props.root?.title ?? 'skill tree'}</Typography>
  </div>
);
