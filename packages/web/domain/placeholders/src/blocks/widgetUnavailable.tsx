/**
 * Placeholders.WidgetUnavailable — компактный плейсхолдер вместо упавшего/
 * недоступного виджета. Эмитит `onRetry`. Рассчитан на встраивание в узкий слот
 * (compact-вариант каркаса), поэтому меньше отступов и типографики.
 */

import { useEmitOptional } from '@capsuletech/web-core';
import { Unplug } from '@capsuletech/web-ui/icons';
import type { JSX } from 'solid-js';
import PlaceholderShell from '../shell/shell';
import type { IWidgetUnavailableEvents, IWidgetUnavailableProps } from './types';

const DEFAULT_TITLE = 'Виджет недоступен';
const DEFAULT_DESCRIPTION = 'Не удалось отобразить этот блок.';
const DEFAULT_ACTION = 'Обновить';

const WidgetUnavailableComponent = (props: IWidgetUnavailableProps): JSX.Element => {
  const emit = useEmitOptional();

  return (
    <PlaceholderShell
      compact
      icon={<Unplug class="size-5" />}
      title={props.title ?? DEFAULT_TITLE}
      description={props.description ?? DEFAULT_DESCRIPTION}
      action={{
        label: props.actionLabel ?? DEFAULT_ACTION,
        variant: 'outline',
        onClick: () => emit('onRetry', { source: 'Placeholders.WidgetUnavailable' }),
      }}
    />
  );
};

/**
 * Phantom `__events?: IWidgetUnavailableEvents` → codegen
 * `Placeholders.WidgetUnavailable.Events`.
 */
export const WidgetUnavailable: ((props: IWidgetUnavailableProps) => JSX.Element) & {
  readonly __events?: IWidgetUnavailableEvents;
} = WidgetUnavailableComponent;

export default WidgetUnavailable;
