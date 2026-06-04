/**
 * ContainerItem — контейнер/композиция со вложенными composite-частями под чевроном.
 *
 * Чеврон: ChevronRight из @capsuletech/web-ui/icons — rotate-90 когда открыт.
 * Кнопка чеврона: Button variant="ghost" size="icon" из @capsuletech/web-ui/button.
 */

import type { Registry } from '@capsuletech/web-renderer';
import { Button } from '@capsuletech/web-ui/button';
import { Flex } from '@capsuletech/web-ui/flex';
import { ChevronRight } from '@capsuletech/web-ui/icons';
import { createSignal, For, Show } from 'solid-js';
import type { IComponentManifest } from '../../manifests';
import { Item } from './Item';
import { TemplatesTrigger } from './TemplatesTrigger';

export const ContainerItem = (props: {
  m: IComponentManifest;
  partsOf: (t: string) => IComponentManifest[];
  registry: Registry;
}) => {
  const parts = () => props.partsOf(props.m.type);
  const [open, setOpen] = createSignal(false);

  return (
    <Flex orientation="vertical" gap={0.5} class="w-full items-start">
      <Flex orientation="horizontal" align="center" justify="between" gap={0.5} class="w-full">
        <Flex orientation="horizontal" align="center" gap={0.5} class="min-w-0">
          <Show when={parts().length > 0}>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setOpen((o) => !o)}
              aria-label={open() ? 'Свернуть' : 'Развернуть'}
              class="size-4 shrink-0 text-foreground/40 transition-transform hover:text-foreground"
              classList={{ 'rotate-90': open() }}
              data-testid={`chevron-${props.m.type}`}
            >
              <ChevronRight size={12} aria-hidden="true" />
            </Button>
          </Show>
          <Item m={props.m} />
        </Flex>
        <TemplatesTrigger forType={props.m.type} registry={props.registry} />
      </Flex>
      <Show when={parts().length > 0 && open()}>
        <Flex
          orientation="vertical"
          gap={0.5}
          class="ml-3 items-start border-l border-border/50 pl-2"
        >
          <For each={parts()}>{(c) => <Item m={c} />}</For>
        </Flex>
      </Show>
    </Flex>
  );
};
