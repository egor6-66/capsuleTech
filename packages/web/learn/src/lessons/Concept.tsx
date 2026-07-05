/**
 * Learn.Lessons.Concept — статья выбранного концепта
 * (`lessonsStore.currentConcept()`): title → принцип (muted) → markdown-тело
 * (через `Markdown` → `Prose`) → примеры (en/ru). Fallback до выбора.
 *
 * Чистый display — событий не эмитит (навигация делается из `Concepts`).
 * Phantom-`__events` не нужен (нет своих событий).
 * Регистрируется как `Learn.Lessons.Concept` через `../capsule` (ADR 033).
 */
import { Card } from '@capsuletech/web-ui/card';
import { Layout } from '@capsuletech/web-ui/layout';
import { Typography } from '@capsuletech/web-ui/typography';
import { For, Show } from 'solid-js';
import { Markdown } from './Markdown';
import { lessonsStore } from './store';

export interface IConceptProps {
  class?: string;
}

export const Concept = (props: IConceptProps) => (
  <Show
    when={lessonsStore.currentConcept()}
    fallback={
      <Layout.Flex h="full" align="center" justify="center" p={6} class={props.class}>
        <Typography tone="muted">Выберите концепт</Typography>
      </Layout.Flex>
    }
  >
    {(concept) => (
      <Layout.Flex orientation="vertical" gapY={3} p={6} class={props.class}>
        <Typography variant="h1">{concept().title}</Typography>

        <Show when={concept().principle}>
          <Typography tone="muted">{concept().principle}</Typography>
        </Show>

        <Markdown body={concept().body} />

        <Show when={concept().examples.length > 0}>
          <Layout.Flex orientation="vertical" gapY={2}>
            <For each={concept().examples}>
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
      </Layout.Flex>
    )}
  </Show>
);

export default Concept;
