/**
 * ManifestBlock — данные манифеста компонента + описание выбранного
 * пресета (`IPreset.description`). Описание подсвечено в отдельной
 * рамке — это смысловая нагрузка вариации, а не компонента.
 *
 * «Дефолтные пропсы» = frozen snapshot пропсов пресета (из registry,
 * `preset.schema.components.nodes[root].props`). Это «эталон» — что пресет
 * включил по умолчанию. НЕ меняется при ручной правке Inspector'ом —
 * полезно увидеть «откуда начали», когда юзер поменял что-то и хочет
 * понять, что было дефолтом этой вариации.
 *
 * Глубокий разбор `propsSchema` (Zod walk + типы полей) — следующая итерация.
 */

import { Flex } from '@capsuletech/web-ui/flex';
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
          <Show when={Object.keys(presetDefaultProps()).length}>
            <div>
              <div class="mb-1 text-muted-foreground">Дефолтные пропсы пресета:</div>
              <ul class="space-y-0.5 pl-3 font-mono text-[11px]">
                <For each={Object.entries(presetDefaultProps())}>
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
};
