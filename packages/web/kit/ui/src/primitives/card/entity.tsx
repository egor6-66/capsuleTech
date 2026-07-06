import { cn } from '@capsuletech/web-style';
import { For, Show } from 'solid-js';

import { Badge } from '../badge';
import type { ICardEntityProps } from './interfaces';

// Static align table — Tailwind purge sees all classes.
const STACK_ALIGN: Record<NonNullable<ICardEntityProps['align']>, string> = {
  start: 'items-start text-left',
  center: 'items-center text-center',
};

/**
 * CardEntityContent — the data-driven body of an entity `Card`.
 *
 * A vertical stack rendered from slot data: `title`+`titleAction` (+`badge`)
 * row → `subtitle` → `translation` → `definition` → `tags` (wrap) → `meta`
 * lines. Every slot is `<Show>`-gated, so an absent slot renders nothing. All
 * structure and classes live here (inside the kit) — the consumer feeds data
 * only, zero raw classes leak out.
 */
export const CardEntityContent = (props: ICardEntityProps) => {
  const align = () => props.align ?? 'start';
  const hasTitleRow = () =>
    props.title !== undefined || props.titleAction !== undefined || props.badge !== undefined;

  return (
    <div class={cn('flex flex-col gap-1.5', STACK_ALIGN[align()])}>
      <Show when={hasTitleRow()}>
        <div class="flex items-center gap-2">
          <Show when={props.title !== undefined}>
            <span class="font-semibold leading-tight text-base">{props.title}</span>
          </Show>
          <Show when={props.titleAction !== undefined}>{props.titleAction}</Show>
          <Show when={props.badge !== undefined}>
            <Badge>{props.badge}</Badge>
          </Show>
        </div>
      </Show>

      <Show when={props.subtitle !== undefined}>
        <span class="text-sm text-muted-foreground">{props.subtitle}</span>
      </Show>

      <Show when={props.translation !== undefined}>
        <span class="text-sm">{props.translation}</span>
      </Show>

      <Show when={props.definition !== undefined}>
        <span class="text-sm text-muted-foreground">{props.definition}</span>
      </Show>

      <Show when={props.tags?.length}>
        <div class={cn('flex flex-wrap gap-1', align() === 'center' && 'justify-center')}>
          <For each={props.tags}>{(tag) => <Badge tone="muted">{tag}</Badge>}</For>
        </div>
      </Show>

      <Show when={props.meta?.length}>
        <div class={cn('flex flex-col gap-0.5', align() === 'center' && 'items-center')}>
          <For each={props.meta}>
            {(m) => (
              <div class="text-xs text-muted-foreground">
                <span class="font-medium">{m.key}:</span> {m.value}
              </div>
            )}
          </For>
        </div>
      </Show>
    </div>
  );
};
