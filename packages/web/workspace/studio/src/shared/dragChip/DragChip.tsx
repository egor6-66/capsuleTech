/**
 * DragChip — кастомный drag-overlay студии: чёткий чип с иконкой + названием
 * таскаемого узла дерева, следует за курсором. Заменяет еле заметный дефолтный
 * ghost (`showDefaultOverlay`) на читаемую подпись «что тащим».
 *
 * Props-only из web-ui: `Card` (surface + elevation) + `Flex` + `Typography`.
 * Рендерится через `<DragOverlay>` (web-dnd) внутри `WebStudio.Provider`.
 * Реагирует только на tree-drag'и (`data.src === 'tree'`).
 */

import type { DragData } from '@capsuletech/web-dnd';
import { Card } from '@capsuletech/web-ui/card';
import { Flex } from '@capsuletech/web-ui/flex';
import { getManifest } from '@capsuletech/web-ui/manifest';
import { Typography } from '@capsuletech/web-ui/typography';
import { Show } from 'solid-js';

export const DragChip = (props: { data: DragData }) => {
  const type = () => String(props.data.nodeType ?? '');
  const manifest = () => getManifest(type());
  const label = () => manifest()?.label ?? type();

  return (
    <Show when={props.data.src === 'tree'}>
      <Card padding="sm" elevation="lg">
        <Flex align="center" gap={2}>
          <Show when={manifest()?.icon}>
            <Typography as="span" size="xs" tone="muted">
              {manifest()!.icon()}
            </Typography>
          </Show>
          <Typography as="span" size="xs" weight="medium" class="truncate">
            {label()}
          </Typography>
        </Flex>
      </Card>
    </Show>
  );
};
