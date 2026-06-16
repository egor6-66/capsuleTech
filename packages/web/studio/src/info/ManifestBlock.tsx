/**
 * ManifestBlock — данные манифеста компонента + описание выбранного
 * пресета (`IPreset.description`). Описание подсвечено в отдельной
 * рамке — это смысловая нагрузка вариации, а не компонента.
 *
 * Глубокий разбор `propsSchema` (Zod walk + типы полей) — следующая итерация.
 */

import { Flex } from '@capsuletech/web-ui/flex';
import { For, Show } from 'solid-js';
import type { IManifestBlockProps } from './types';

export const ManifestBlock = (props: IManifestBlockProps) => (
  <Show
    when={props.manifest}
    fallback={
      <div class="px-2 py-1 text-xs text-muted-foreground">
        Манифест для <code>{props.type}</code> не найден.
      </div>
    }
  >
    {(m) => (
      <Flex orientation="vertical" gap={2} class="px-2 py-1 text-xs">
        <div>
          <span class="font-medium">{m().label}</span>
          <span class="text-muted-foreground"> · {m().category}</span>
        </div>
        <Show when={m().description}>
          <div class="text-muted-foreground">{m().description}</div>
        </Show>
        <Show when={props.preset.description}>
          <div class="rounded bg-muted/30 p-2">
            <div class="mb-1 text-[10px] uppercase tracking-wide text-muted-foreground">
              Пресет «{props.preset.label}»
            </div>
            <div>{props.preset.description}</div>
          </div>
        </Show>
        <Show when={Object.keys(m().defaultProps ?? {}).length}>
          <div>
            <div class="mb-1 text-muted-foreground">Дефолтные пропсы:</div>
            <ul class="space-y-0.5 pl-3 font-mono text-[11px]">
              <For each={Object.entries(m().defaultProps)}>
                {([k, v]) => (
                  <li>
                    <span class="text-foreground">{k}</span>
                    <span class="text-muted-foreground"> = {JSON.stringify(v)}</span>
                  </li>
                )}
              </For>
            </ul>
          </div>
        </Show>
      </Flex>
    )}
  </Show>
);
