/**
 * ManifestBlock — данные манифеста компонента + описание выбранного
 * пресета (`IPreset.description`). Описание подсвечено в отдельной
 * рамке (`Card padding="sm"`) — это смысловая нагрузка вариации, а не компонента.
 *
 * «Дефолтные пропсы» = frozen snapshot пропсов пресета (из registry,
 * `preset.schema.components.nodes[root].props`). Это «эталон» — что пресет
 * включил по умолчанию. НЕ меняется при ручной правке Inspector'ом —
 * полезно увидеть «откуда начали», когда юзер поменял что-то и хочет
 * понять, что было дефолтом этой вариации.
 *
 * Весь визуал — props-only из web-ui (Flex/Typography/Card), ноль raw-классов.
 * Глубокий разбор `propsSchema` (Zod walk + типы полей) — следующая итерация.
 */

import { Card } from '@capsuletech/web-ui/card';
import { Flex } from '@capsuletech/web-ui/flex';
import { Typography } from '@capsuletech/web-ui/typography';
import { For, Show } from 'solid-js';
import type { IManifestBlockProps } from './types';

export const ManifestBlock = (props: IManifestBlockProps) => {
  // Пропсы корня пресета — frozen snapshot из registry. Не реактивный
  // (preset-объект иммутабельный), пересчитывается только при смене пресета.
  const presetDefaultProps = (): Record<string, unknown> => {
    const schema = props.preset.schema;
    const root = schema.components.nodes[schema.components.root];
    return (root?.props ?? {}) as Record<string, unknown>;
  };

  return (
    <Show
      when={props.manifest}
      fallback={
        <Flex px={2} py={1}>
          <Typography size="xs" tone="muted">
            Манифест для <code>{props.type}</code> не найден.
          </Typography>
        </Flex>
      }
    >
      {(m) => (
        <Flex orientation="vertical" gap={2} px={2} py={1}>
          <Typography size="xs">
            <Typography as="span" size="xs" weight="medium" tone="default">
              {m().label}
            </Typography>
            <Typography as="span" size="xs" tone="muted">
              {' · '}
              {m().category}
            </Typography>
          </Typography>
          <Show when={m().description}>
            <Typography size="xs" tone="muted">
              {m().description}
            </Typography>
          </Show>
          <Show when={props.preset.description}>
            <Card padding="sm">
              <Flex orientation="vertical" gap={1}>
                <Typography variant="overline" tone="muted">
                  Пресет «{props.preset.label}»
                </Typography>
                <Typography size="xs">{props.preset.description}</Typography>
              </Flex>
            </Card>
          </Show>
          <Show when={Object.keys(presetDefaultProps()).length}>
            <Flex orientation="vertical" gap={1}>
              <Typography size="xs" tone="muted">
                Дефолтные пропсы пресета:
              </Typography>
              <Flex orientation="vertical" gap={0.5}>
                <For each={Object.entries(presetDefaultProps())}>
                  {([k, v]) => (
                    <Typography size="xs" mono>
                      <Typography as="span" size="xs" mono tone="default">
                        {k}
                      </Typography>
                      <Typography as="span" size="xs" mono tone="muted">
                        {' = '}
                        {JSON.stringify(v)}
                      </Typography>
                    </Typography>
                  )}
                </For>
              </Flex>
            </Flex>
          </Show>
        </Flex>
      )}
    </Show>
  );
};
