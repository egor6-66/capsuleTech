/**
 * RowLabel — иконка + название для строки дерева. Stateless: получает
 * manifest и type через props. Используется и контейнером (внутри
 * `Accordion.Trigger`) и листом (плоская строка).
 *
 * Props-only из web-ui (Flex/Typography). `truncate`/`shrink-0` — functional
 * ellipsis-механика (нет kit-пропа, grep-safe residual).
 */

import { Flex } from '@capsuletech/web-ui/flex';
import type { IPrimitiveManifestEntry } from '@capsuletech/web-ui/manifest';
import { Typography } from '@capsuletech/web-ui/typography';
import { Show } from 'solid-js';

export interface IRowLabelProps {
  manifest: IPrimitiveManifestEntry | undefined;
  nodeType: string | undefined;
}

export const RowLabel = (props: IRowLabelProps) => {
  const label = () => props.manifest?.label ?? props.nodeType ?? '???';
  return (
    <Flex inline align="center" gap={2} minW={0}>
      <Show when={props.manifest?.icon}>
        <Typography as="span" size="xs" tone="muted" class="shrink-0">
          {props.manifest!.icon()}
        </Typography>
      </Show>
      <Typography as="span" size="xs" class="truncate">
        {label()}
      </Typography>
    </Flex>
  );
};
