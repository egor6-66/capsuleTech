/**
 * RowLabel — иконка + название для строки дерева. Stateless: получает
 * manifest и type через props. Используется и контейнером (внутри
 * `Accordion.Trigger`) и листом (плоская строка).
 */

import type { IPrimitiveManifestEntry } from '@capsuletech/web-ui/manifest';
import { Show } from 'solid-js';

export interface IRowLabelProps {
  manifest: IPrimitiveManifestEntry | undefined;
  nodeType: string | undefined;
}

export const RowLabel = (props: IRowLabelProps) => {
  const label = () => props.manifest?.label ?? props.nodeType ?? '???';
  return (
    <span class="inline-flex min-w-0 items-center gap-2 truncate text-xs">
      <Show when={props.manifest?.icon}>
        <span class="shrink-0 text-muted-foreground">{props.manifest!.icon()}</span>
      </Show>
      <span class="truncate">{label()}</span>
    </span>
  );
};
