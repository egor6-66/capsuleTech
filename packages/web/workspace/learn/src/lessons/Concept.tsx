/**
 * Learn.Lessons.Concept — статья выбранного концепта (URL-driven по `id`-пропу):
 * title (рендерим сами) → принцип (muted) → markdown-тело (`Markdown` → `Prose`,
 * ведущий H1 срезан) → примеры (en/ru) → чипы `relatedRules` («Смотри правила»).
 * Данные — из кэша стора (`lessonsStore.concept(id)`, дедуп).
 *
 * Кросс-навигация (ADR 069): чип relatedRules → emit `onRuleSelect { id }`;
 * wikilink в теле (`[[ref]]`) → `emitRefNav` (правило/концепт по спискам).
 * `useEmitOptional` — тот же контракт, что остальные connected-блоки.
 *
 * Phantom `__events?: IConceptEvents` → codegen `Learn.Lessons.Concept.Events`.
 * Регистрируется как `Learn.Lessons.Concept` через `../capsule` (ADR 033).
 */
import { useEmitOptional } from '@capsuletech/web-core';
import { Badge } from '@capsuletech/web-ui/badge';
import { Card } from '@capsuletech/web-ui/card';
import { Layout } from '@capsuletech/web-ui/layout';
import { Typography } from '@capsuletech/web-ui/typography';
import { createEffect, For, Show } from 'solid-js';
import { useApiBase } from '../core/apiContext';
import { Markdown } from './Markdown';
import { emitRefNav } from './refnav';
import { lessonsStore } from './store';

export interface IConceptProps {
  class?: string;
  /** Концепт к показу (из URL). */
  id?: string;
}

export interface IConceptEvents {
  onRuleSelect: { id: string };
  onConceptSelect: { id: string };
}

const ConceptComponent = (props: IConceptProps) => {
  const apiBase = useApiBase();
  const emit = useEmitOptional();

  createEffect(() => {
    const id = props.id;
    if (id) void lessonsStore.openConcept(apiBase, id);
  });

  const concept = () => (props.id ? lessonsStore.concept(props.id) : null);
  const onWikilink = (ref: string) => void emitRefNav(ref, apiBase, 'Learn.Lessons.Concept', emit);
  const selectRule = (id: string) =>
    emit('onRuleSelect', { source: 'Learn.Lessons.Concept', payload: { id } });
  // Подпись чипа = title правила, если список правил загружен, иначе сам id.
  const ruleLabel = (id: string) => lessonsStore.rules().find((r) => r.id === id)?.title ?? id;

  return (
    <Show
      when={concept()}
      fallback={
        <Layout.Flex h="full" align="center" justify="center" p={6} class={props.class}>
          <Typography tone="muted">Выберите концепт</Typography>
        </Layout.Flex>
      }
    >
      {(c) => (
        <Layout.Flex orientation="vertical" gapY={3} p={6} class={props.class}>
          <Typography variant="h1">{c().title}</Typography>

          <Show when={c().principle}>
            <Typography tone="muted">{c().principle}</Typography>
          </Show>

          <Markdown body={c().body} stripLeadingH1 onWikilink={onWikilink} />

          <Show when={c().examples.length > 0}>
            <Layout.Flex orientation="vertical" gapY={2}>
              <For each={c().examples}>
                {(ex) => (
                  <Card padding="sm">
                    <Layout.Flex orientation="vertical" gapY={0}>
                      <Typography>{ex.en}</Typography>
                      <Typography size="sm" tone="muted">
                        {ex.ru}
                      </Typography>
                    </Layout.Flex>
                  </Card>
                )}
              </For>
            </Layout.Flex>
          </Show>

          <Show when={c().relatedRules.length > 0}>
            <Layout.Flex orientation="vertical" gapY={1}>
              <Typography size="sm" tone="muted">
                Смотри правила
              </Typography>
              <Layout.Flex orientation="horizontal" gapX={1} gapY={1} wrap="wrap">
                <For each={c().relatedRules}>
                  {(ruleId) => (
                    <Badge interactive onClick={() => selectRule(ruleId)}>
                      {ruleLabel(ruleId)}
                    </Badge>
                  )}
                </For>
              </Layout.Flex>
            </Layout.Flex>
          </Show>
        </Layout.Flex>
      )}
    </Show>
  );
};

/** Phantom `__events` для codegen (см. `View`). На runtime не используется. */
export const Concept: ((props: IConceptProps) => ReturnType<typeof ConceptComponent>) & {
  readonly __events?: IConceptEvents;
} = ConceptComponent;

export default Concept;
