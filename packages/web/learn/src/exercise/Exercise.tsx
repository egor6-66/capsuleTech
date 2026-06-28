/**
 * Learn.Exercise — диспетчер упражнения по `type` (Switch/Match).
 * SKELETON: под-типы — плейсхолдеры; реальная механика — следующая итерация.
 */
import { Typography } from '@capsuletech/web-ui/typography';
import { type Component, Match, Switch } from 'solid-js';
import type { ExerciseType } from '../core';
import { BuildClause } from './BuildClause';
import { FillBlank } from './FillBlank';
import { FixTypeError } from './FixTypeError';
import { Translate } from './Translate';

export interface IExerciseProps {
  type: ExerciseType;
  conceptId?: string;
}

export const Exercise: Component<IExerciseProps> = (props) => (
  <div data-stub="Learn.Exercise">
    <Switch fallback={<Typography tone="muted">unknown exercise</Typography>}>
      <Match when={props.type === 'fill-blank'}>
        <FillBlank />
      </Match>
      <Match when={props.type === 'build-clause'}>
        <BuildClause />
      </Match>
      <Match when={props.type === 'fix-type-error'}>
        <FixTypeError />
      </Match>
      <Match when={props.type === 'translate'}>
        <Translate />
      </Match>
    </Switch>
  </div>
);
