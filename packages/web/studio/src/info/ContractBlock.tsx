/**
 * ContractBlock — рендерит surface `Contract`'а компонента:
 * имя / kind, флаг `isLeaf`, варианты, стилевые слоты, raw-список правил.
 *
 * Humanizer (id правила → человеческая строка) — следующая итерация;
 * пока показываем `[severity] ruleId` в свёрнутом `<details>`.
 */

import { Flex } from '@capsuletech/web-ui/flex';
import { For, Show } from 'solid-js';
import type { IContractBlockProps } from './types';

export const ContractBlock = (props: IContractBlockProps) => (
  <Show
    when={props.contract}
    fallback={
      <div class="px-2 py-1 text-xs text-muted-foreground">
        Для <code>{props.type}</code> контракт пока не описан.
      </div>
    }
  >
    {(c) => (
      <Flex orientation="vertical" gap={2} class="px-2 py-1 text-xs">
        <div class="text-muted-foreground">
          <span class="font-medium text-foreground">{c().name}</span>
          {' · '}
          <span>{c().kind}</span>
        </div>
        <Show when={c().surface.isLeaf}>
          <div class="text-muted-foreground">Не принимает вложенные элементы (leaf)</div>
        </Show>
        <Show when={c().surface.variants?.length}>
          <div>
            <div class="mb-1 text-muted-foreground">Варианты:</div>
            <div class="flex flex-wrap gap-1">
              <For each={c().surface.variants}>
                {(v) => (
                  <span class="rounded bg-muted/40 px-1.5 py-0.5 font-mono text-[11px]">{v}</span>
                )}
              </For>
            </div>
          </div>
        </Show>
        <Show when={c().surface.styleSlots?.length}>
          <div>
            <span class="text-muted-foreground">Стилевые слоты: </span>
            <span class="font-mono text-[11px]">{c().surface.styleSlots!.join(', ')}</span>
          </div>
        </Show>
        <Show when={c().rules.length}>
          <details class="mt-1">
            <summary class="cursor-pointer text-muted-foreground">
              Правила ({c().rules.length})
            </summary>
            <ul class="mt-1 space-y-0.5 pl-3">
              <For each={c().rules}>
                {(r) => (
                  <li class="font-mono text-[11px]">
                    <span class="text-muted-foreground">[{r.severity}]</span> {r.id}
                  </li>
                )}
              </For>
            </ul>
          </details>
        </Show>
      </Flex>
    )}
  </Show>
);
