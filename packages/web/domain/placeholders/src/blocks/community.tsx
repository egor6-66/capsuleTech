/**
 * Placeholders.Community — «доступ только для сообщества». Эмитит `onJoin`.
 * Показывается на разделах, открытых только участникам комьюнити/подписки.
 */

import { useEmitOptional } from '@capsuletech/web-core';
import { UsersRound } from '@capsuletech/web-ui/icons';
import type { JSX } from 'solid-js';
import PlaceholderShell from '../shell/shell';
import type { ICommunityEvents, ICommunityProps } from './types';

const DEFAULT_TITLE = 'Только для сообщества';
const DEFAULT_DESCRIPTION =
  'Этот раздел доступен участникам сообщества. Присоединяйтесь, чтобы открыть доступ.';
const DEFAULT_ACTION = 'Присоединиться';

const CommunityComponent = (props: ICommunityProps): JSX.Element => {
  const emit = useEmitOptional();

  return (
    <PlaceholderShell
      icon={<UsersRound class="size-8" />}
      eyebrow="Сообщество"
      title={props.title ?? DEFAULT_TITLE}
      description={props.description ?? DEFAULT_DESCRIPTION}
      action={{
        label: props.actionLabel ?? DEFAULT_ACTION,
        onClick: () => emit('onJoin', { source: 'Placeholders.Community' }),
      }}
    />
  );
};

/**
 * Phantom `__events?: ICommunityEvents` → codegen `Placeholders.Community.Events`.
 */
export const Community: ((props: ICommunityProps) => JSX.Element) & {
  readonly __events?: ICommunityEvents;
} = CommunityComponent;

export default Community;
