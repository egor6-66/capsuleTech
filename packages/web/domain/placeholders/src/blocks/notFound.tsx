/**
 * Placeholders.NotFound — 404-плейсхолдер. Эмитит `onHome` при клике по кнопке.
 * Tier-2 connected: обычный компонент, рендерится внутри HCA-контекста аппа и
 * баблит событие в его доменную Feature через `useEmitOptional` (эталон learn).
 */

import { useEmitOptional } from '@capsuletech/web-core';
import { Compass } from '@capsuletech/web-ui/icons';
import type { JSX } from 'solid-js';
import PlaceholderShell from '../shell/shell';
import type { INotFoundEvents, INotFoundProps } from './types';

const DEFAULT_TITLE = 'Страница не найдена';
const DEFAULT_DESCRIPTION = 'Кажется, такой страницы нет или она была перемещена.';
const DEFAULT_ACTION = 'На главную';

const NotFoundComponent = (props: INotFoundProps): JSX.Element => {
  const emit = useEmitOptional();

  return (
    <PlaceholderShell
      icon={<Compass class="size-8" />}
      eyebrow="404"
      title={props.title ?? DEFAULT_TITLE}
      description={props.description ?? DEFAULT_DESCRIPTION}
      action={{
        label: props.actionLabel ?? DEFAULT_ACTION,
        onClick: () => emit('onHome', { source: 'Placeholders.NotFound' }),
      }}
    />
  );
};

/**
 * Phantom `__events?: INotFoundEvents` нужен codegen-у для генерации
 * `Placeholders.NotFound.Events`. На runtime не используется.
 */
export const NotFound: ((props: INotFoundProps) => JSX.Element) & {
  readonly __events?: INotFoundEvents;
} = NotFoundComponent;

export default NotFound;
