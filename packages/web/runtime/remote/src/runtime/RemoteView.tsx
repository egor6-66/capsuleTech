/**
 * RemoteView — тонкая обёртка над useRemote().Remote для регистрации
 * через ADR 033 capsule-manifest (Remote.View глобал).
 *
 * Предназначен для использования как `Remote.View` в глобальном реестре:
 *   <Remote.View name="geo" instanceId="left" />
 *
 * Не добавляет собственной логики — только bridging из контекста.
 */

import type { JSX } from 'solid-js';
import type { IRemoteComponentProps } from '../interfaces';
import { useRemote } from './useRemote';

export const RemoteView = (props: IRemoteComponentProps): JSX.Element => {
  const { Remote } = useRemote();
  return <Remote {...props} />;
};
