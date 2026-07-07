/**
 * ContractBlock — рендерит surface `Contract`'а компонента:
 * имя / kind, флаг `isLeaf`, варианты, стилевые слоты, raw-список правил.
 *
 * Весь визуал — props-only из web-ui (Flex/Typography/Badge), ноль raw-классов
 * (residual: `<details>/<summary>` disclosure + `cursor-pointer` — kit-эквивалента
 * нет). Humanizer (id правила → человеческая строка) — следующая итерация.
 */

import { Badge } from '@capsuletech/web-ui/badge';
import { Flex } from '@capsuletech/web-ui/flex';
import { Typography } from '@capsuletech/web-ui/typography';
import { For, Show } from 'solid-js';
import type { IContractBlockProps } from './types';

export const ContractBlock = (props: IContractBlockProps) => (
  <Show
    when={props.contract}
    fallback={
      <Flex px={2} py={1}>
        <Typography size="xs" tone="muted">
          Для <code>{props.type}</code> контракт пока не описан.
        </Typography>
      </Flex>
    }
  >
    {(c) => (
      <Flex orientation="vertical" gap={2} px={2} py={1}>
        <Typography size="xs" tone="muted">
          <Typography as="span" size="xs" weight="medium" tone="default">
            {c().name}
          </Typography>
          {' · '}
          {c().kind}
        </Typography>
        <Show when={c().surface.isLeaf}>
          <Typography size="xs" tone="muted">
            Не принимает вложенные элементы (leaf)
          </Typography>
        </Show>
        <Show when={c().surface.variants?.length}>
          <Flex orientation="vertical" gap={1}>
            <Typography size="xs" tone="muted">
              Варианты:
            </Typography>
            <Flex wrap="wrap" gap={1}>
              <For each={c().surface.variants}>{(v) => <Badge>{v}</Badge>}</For>
            </Flex>
          </Flex>
        </Show>
        <Show when={c().surface.styleSlots?.length}>
          <Typography size="xs" tone="muted">
            Стилевые слоты:{' '}
            <Typography as="span" size="xs" mono tone="default">
              {c().surface.styleSlots!.join(', ')}
            </Typography>
          </Typography>
        </Show>
        <Show when={c().rules.length}>
          <details>
            {/* residual: нативный disclosure + cursor-pointer — kit-эквивалента нет */}
            <summary class="cursor-pointer">
              <Typography as="span" size="xs" tone="muted">
                Правила ({c().rules.length})
              </Typography>
            </summary>
            <Flex orientation="vertical" gap={0.5} py={1}>
              <For each={c().rules}>
                {(r) => (
                  <Typography size="xs" mono>
                    <Typography as="span" size="xs" mono tone="muted">
                      [{r.severity}]
                    </Typography>{' '}
                    {r.id}
                  </Typography>
                )}
              </For>
            </Flex>
          </details>
        </Show>
      </Flex>
    )}
  </Show>
);
