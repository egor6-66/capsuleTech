import { For, Show } from 'solid-js';

import { useTrace } from '../../internal/useTrace';
import { Badge } from '../../primitives/badge';
import { Card } from '../../primitives/card';
import { Flex } from '../../primitives/layout/flex';
import { Typography } from '../../primitives/typography';
import type { IArticleProps } from './interfaces';

/**
 * Article — «heading + lead + markdown body + examples + related» as one kit
 * composite.
 *
 * The single kit home for the article pattern learn `Concept` used to
 * hand-compose (`Layout.Flex` + `Typography h1` + `Markdown` + `For` example
 * cards + `For` related chips). A vertical stack; every slot `<Show>`-gated so
 * an absent slot renders nothing. All structure/chrome lives here — consumers
 * feed only data (zero raw classes leak out).
 *
 * `body` is a **node slot**: the consumer passes its own rendered markdown; the
 * kit only positions it (see `IArticleProps.body`).
 *
 * @example
 * ```tsx
 * <Article
 *   title="UiProxy"
 *   lead="UI — тень логики."
 *   body={<Markdown source={concept.body} />}
 *   examples={concept.examples}
 *   related={concept.rules}
 *   relatedLabel="Смотри правила"
 *   onRelatedSelect={goToRule}
 * />
 * ```
 */
export function Article(props: IArticleProps) {
  useTrace('web-ui.article'); // ADR 062

  return (
    <Flex orientation="vertical" gapY={6} class={props.class}>
      <Show when={props.title !== undefined}>
        <Typography variant="h1">{props.title}</Typography>
      </Show>

      <Show when={props.lead !== undefined}>
        <Typography tone="muted" size="lg">
          {props.lead}
        </Typography>
      </Show>

      <Show when={props.body !== undefined}>{props.body}</Show>

      <Show when={props.examples?.length}>
        <Flex orientation="vertical" gapY={3}>
          <For each={props.examples}>
            {(ex) => <Card padding="sm" title={ex.primary} subtitle={ex.secondary} />}
          </For>
        </Flex>
      </Show>

      <Show when={props.related?.length}>
        <Flex orientation="vertical" gapY={2}>
          <Show when={props.relatedLabel !== undefined}>
            <Typography variant="h3">{props.relatedLabel}</Typography>
          </Show>
          <Flex wrap="wrap" gap={2}>
            <For each={props.related}>
              {(rel) => (
                <Badge interactive onClick={() => props.onRelatedSelect?.(rel.id)}>
                  {rel.label}
                </Badge>
              )}
            </For>
          </Flex>
        </Flex>
      </Show>
    </Flex>
  );
}
