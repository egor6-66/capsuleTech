/**
 * RemoteView — тонкая обёртка над useRemote().Remote для регистрации
 * через ADR 033 capsule-manifest (Remote.View глобал).
 *
 * Предназначен для использования как `Remote.View` в глобальном реестре:
 *   <Remote.View name="geo" instanceId="left" />
 *
 * Типизирован по контракту ремоута (ADR 060 D6): для `name`, присутствующего в
 * `CapsuleRemotes` (наполняется сгенерённым `.capsule/@types/remotes.d.ts`),
 * `on<Out>`-пропсы типизируются payload'ом события; неизвестное событие / неверный
 * payload — TS-ошибка. Неизвестный `name` → слабая типизация (back-compat).
 *
 * Не добавляет собственной логики — только bridging из контекста.
 */

import type { JSX } from 'solid-js';
import type { IRemoteComponentProps, IRemoteViewProps } from '../interfaces';
import { useRemote } from './useRemote';

export function RemoteView<N extends string = string>(props: IRemoteViewProps<N>): JSX.Element {
  const { Remote } = useRemote();
  // The conditional IRemoteViewProps<N> narrows host-side; the runtime component
  // only needs the structural IRemoteComponentProps shape (name + on* + config).
  return <Remote {...(props as unknown as IRemoteComponentProps)} />;
}
