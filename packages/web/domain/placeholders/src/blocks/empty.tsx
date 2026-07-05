/**
 * Placeholders.Empty — нейтральное пустое состояние (не ошибка/отказ).
 * Для «выберите урок / практик нет / библиотека пуста» — там, где раньше
 * аппы рисовали центрированный `Typography tone="muted"` руками.
 *
 * Действие — опциональное: `onAction` эмитится ТОЛЬКО когда потребитель задал
 * `actionLabel`. Без него блок — чистое информационное пусто (ни кнопки, ни
 * события). Иконку можно переопределить (`icon`), по умолчанию нейтральная
 * `Inbox`.
 */

import { useEmitOptional } from '@capsuletech/web-core';
import { Inbox } from '@capsuletech/web-ui/icons';
import type { JSX } from 'solid-js';
import PlaceholderShell from '../shell/shell';
import type { IEmptyEvents, IEmptyProps } from './types';

const DEFAULT_TITLE = 'Пусто';

const EmptyComponent = (props: IEmptyProps): JSX.Element => {
  const emit = useEmitOptional();
  const iconSize = () => (props.compact ? 'size-5' : 'size-8');

  return (
    <PlaceholderShell
      compact={props.compact}
      icon={props.icon ?? <Inbox class={iconSize()} />}
      title={props.title ?? DEFAULT_TITLE}
      description={props.description}
      action={
        props.actionLabel
          ? {
              label: props.actionLabel,
              variant: 'outline',
              onClick: () => emit('onAction', { source: 'Placeholders.Empty' }),
            }
          : undefined
      }
    />
  );
};

/**
 * Phantom `__events?: IEmptyEvents` → codegen `Placeholders.Empty.Events`.
 */
export const Empty: ((props: IEmptyProps) => JSX.Element) & {
  readonly __events?: IEmptyEvents;
} = EmptyComponent;

export default Empty;
