/**
 * Learn.Lessons.Concepts — список концептов (библиотека прозы): title +
 * principle. Lazy-load при первом монтировании (пустой стор — зеркало
 * `Learn.Lessons.List`). Клик → `lessonsStore.openConcept` (fetch статьи) +
 * emit `onConceptSelect { id }`.
 *
 * `useEmitOptional` (не `useEmit`) — блок может рендериться вне Controller/
 * Feature-scope (unit-тесты); emit тихо no-op'ится вне scope.
 *
 * Phantom `__events?: IConceptsEvents` → codegen `Learn.Lessons.Concepts.Events`.
 * Регистрируется как `Learn.Lessons.Concepts` через `../capsule` (ADR 033).
 */
import { useEmitOptional } from '@capsuletech/web-core';
import { Card } from '@capsuletech/web-ui/card';
import { Layout } from '@capsuletech/web-ui/layout';
import { Typography } from '@capsuletech/web-ui/typography';
import { For, onMount, Show } from 'solid-js';
import { useApiBase } from '../core/apiContext';
import { lessonsStore } from './store';

export interface IConceptsProps {
  class?: string;
}

export interface IConceptsEvents {
  onConceptSelect: { id: string };
}

const ConceptsComponent = (props: IConceptsProps) => {
  const apiBase = useApiBase();
  const emit = useEmitOptional();

  onMount(() => {
    if (lessonsStore.concepts().length === 0) void lessonsStore.loadConcepts(apiBase);
  });

  const handleSelect = (id: string) => {
    void lessonsStore.openConcept(apiBase, id);
    emit('onConceptSelect', { source: 'Learn.Lessons.Concepts', payload: { id } });
  };

  return (
    <Layout.Flex orientation="vertical" gapY={1} p={1} class={props.class}>
      <For each={lessonsStore.concepts()}>
        {(concept) => (
          <Card
            role="button"
            tabIndex={0}
            interactive
            selected={lessonsStore.selectedConceptId() === concept.id}
            padding="sm"
            onClick={() => handleSelect(concept.id)}
          >
            <Layout.Flex orientation="vertical" gapY={1}>
              <Typography>{concept.title}</Typography>
              <Show when={concept.principle}>
                <Typography size="sm" tone="muted">
                  {concept.principle}
                </Typography>
              </Show>
            </Layout.Flex>
          </Card>
        )}
      </For>
    </Layout.Flex>
  );
};

/** Phantom `__events` для codegen (см. `List`). На runtime не используется. */
export const Concepts: ((props: IConceptsProps) => ReturnType<typeof ConceptsComponent>) & {
  readonly __events?: IConceptsEvents;
} = ConceptsComponent;

export default Concepts;
