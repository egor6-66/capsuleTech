/**
 * Placeholders.Error — «что-то пошло не так». Эмитит `onRetry` при клике.
 *
 * Экспортируется как `ErrorState` (не `Error` — иначе шадоуит JS-builtin
 * внутри модуля / biome noShadowRestrictedNames). В глобал попадает под ключом
 * `Error` через capsule-манифест (`Error: ErrorState`).
 */

import { useEmitOptional } from '@capsuletech/web-core';
import { TriangleAlert } from '@capsuletech/web-ui/icons';
import type { JSX } from 'solid-js';
import PlaceholderShell from '../shell/shell';
import type { IErrorEvents, IErrorProps } from './types';

const DEFAULT_TITLE = 'Что-то пошло не так';
const DEFAULT_DESCRIPTION = 'Не удалось загрузить содержимое. Попробуйте ещё раз.';
const DEFAULT_ACTION = 'Повторить';

const ErrorComponent = (props: IErrorProps): JSX.Element => {
  const emit = useEmitOptional();

  return (
    <PlaceholderShell
      icon={<TriangleAlert class="size-8" />}
      eyebrow="Ошибка"
      title={props.title ?? DEFAULT_TITLE}
      description={props.description ?? DEFAULT_DESCRIPTION}
      action={{
        label: props.actionLabel ?? DEFAULT_ACTION,
        onClick: () => emit('onRetry', { source: 'Placeholders.Error' }),
      }}
    />
  );
};

/**
 * Phantom `__events?: IErrorEvents` → codegen `Placeholders.Error.Events`.
 */
export const ErrorState: ((props: IErrorProps) => JSX.Element) & {
  readonly __events?: IErrorEvents;
} = ErrorComponent;

export default ErrorState;
