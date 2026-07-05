/**
 * Placeholders.AccessDenied — «нет прав на просмотр». Эмитит `onLogin` при клике.
 * Показывается, когда у текущего пользователя недостаточно прав/роли для раздела.
 */

import { useEmitOptional } from '@capsuletech/web-core';
import { Lock } from '@capsuletech/web-ui/icons';
import type { JSX } from 'solid-js';
import PlaceholderShell from '../shell/shell';
import type { IAccessDeniedEvents, IAccessDeniedProps } from './types';

const DEFAULT_TITLE = 'Нет доступа';
const DEFAULT_DESCRIPTION =
  'У вас недостаточно прав для просмотра этого раздела. Войдите в аккаунт с нужными правами.';
const DEFAULT_ACTION = 'Войти';

const AccessDeniedComponent = (props: IAccessDeniedProps): JSX.Element => {
  const emit = useEmitOptional();

  return (
    <PlaceholderShell
      icon={<Lock class="size-8" />}
      eyebrow="Доступ ограничен"
      title={props.title ?? DEFAULT_TITLE}
      description={props.description ?? DEFAULT_DESCRIPTION}
      action={{
        label: props.actionLabel ?? DEFAULT_ACTION,
        onClick: () => emit('onLogin', { source: 'Placeholders.AccessDenied' }),
      }}
    />
  );
};

/**
 * Phantom `__events?: IAccessDeniedEvents` → codegen `Placeholders.AccessDenied.Events`.
 */
export const AccessDenied: ((props: IAccessDeniedProps) => JSX.Element) & {
  readonly __events?: IAccessDeniedEvents;
} = AccessDeniedComponent;

export default AccessDenied;
