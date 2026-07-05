/**
 * Learn.Lessons.Concepts — библиотека прозы аккордеоном (ADR 069, паттерн
 * studio-палитры на `Ui.Accordion`). Рут = вид концепта (Подход / Паттерн /
 * Рекомендация), элементы = концепты (только title — маршрут-темы, не раздуваем).
 * Порядок групп + ru-подписи + подзаголовки — константа блока; внутри — по
 * `sortOrder`, затем title.
 *
 * URL-driven: активный концепт приходит `id`-пропом (deep-link), клик = emit
 * `onConceptSelect { id }` наверх (апп роутит). В отличие от `Rules`, группы
 * РАЗВЁРНУТЫ по умолчанию — концепты читаются маршрутом, а не point-lookup'ом
 * (раскрываем один раз при первой подгрузке списка; дальше — свобода тоггла).
 *
 * `useEmitOptional` — блок рендерится и вне Controller/Feature-scope (unit).
 * Phantom `__events?: IConceptsEvents` → codegen `Learn.Lessons.Concepts.Events`.
 * Регистрируется как `Learn.Lessons.Concepts` через `../capsule` (ADR 033).
 */
import { useEmitOptional } from '@capsuletech/web-core';
import { Accordion } from '@capsuletech/web-ui/accordion';
import { Card } from '@capsuletech/web-ui/card';
import { Layout } from '@capsuletech/web-ui/layout';
import { Typography } from '@capsuletech/web-ui/typography';
import { createEffect, createSignal, For, onMount, Show } from 'solid-js';
import { useApiBase } from '../core/apiContext';
import { lessonsStore } from './store';
import type { ConceptKind, IConceptSummary } from './types';

export interface IConceptsProps {
  class?: string;
  /** Активный концепт (из URL) — подсветка карточки. */
  id?: string;
}

export interface IConceptsEvents {
  onConceptSelect: { id: string };
}

interface IConceptGroup {
  kind: ConceptKind;
  label: string;
  subtitle: string;
}

/** Порядок видов концептов + ru-подписи (single source — этот блок). */
const CONCEPT_GROUPS: readonly IConceptGroup[] = [
  { kind: 'approach', label: 'Подход', subtitle: 'Как думать о языке в целом.' },
  { kind: 'pattern', label: 'Паттерн', subtitle: 'Повторяемые модели построения.' },
  { kind: 'recommendation', label: 'Рекомендация', subtitle: 'Практические советы и привычки.' },
] as const;

const byOrder = (a: IConceptSummary, b: IConceptSummary): number =>
  a.sortOrder - b.sortOrder || a.title.localeCompare(b.title);

const ConceptsComponent = (props: IConceptsProps) => {
  const apiBase = useApiBase();
  const emit = useEmitOptional();

  onMount(() => {
    if (lessonsStore.concepts().length === 0) void lessonsStore.loadConcepts(apiBase);
  });

  const groups = () =>
    CONCEPT_GROUPS.map((g) => ({
      ...g,
      items: lessonsStore
        .concepts()
        .filter((c) => c.kind === g.kind)
        .sort(byOrder),
    })).filter((g) => g.items.length > 0);

  // Развёрнуто по умолчанию: раскрываем все непустые группы ОДИН раз, когда
  // список впервые подгрузился; далее пользователь тогглит свободно.
  const [open, setOpen] = createSignal<string[]>([]);
  let seeded = false;
  createEffect(() => {
    const gs = groups();
    if (seeded || gs.length === 0) return;
    seeded = true;
    setOpen(gs.map((g) => g.kind));
  });

  const handleSelect = (id: string) => {
    emit('onConceptSelect', { source: 'Learn.Lessons.Concepts', payload: { id } });
  };

  return (
    <Show
      when={groups().length > 0}
      fallback={
        <Layout.Flex p={2} class={props.class}>
          <Typography tone="muted" size="sm">
            Библиотека пуста.
          </Typography>
        </Layout.Flex>
      }
    >
      <Accordion multiple value={open()} onChange={setOpen} class={props.class}>
        <For each={groups()}>
          {(group) => (
            <Accordion.Item value={group.kind}>
              <Accordion.Trigger>
                <Layout.Flex orientation="vertical" gapY={0} align="start">
                  <Typography>{group.label}</Typography>
                  <Typography size="sm" tone="muted">
                    {group.subtitle}
                  </Typography>
                </Layout.Flex>
              </Accordion.Trigger>
              <Accordion.Content>
                <Layout.Flex orientation="vertical" gapY={1} p={1}>
                  <For each={group.items}>
                    {(concept) => (
                      <Card
                        role="button"
                        tabIndex={0}
                        interactive
                        selected={props.id === concept.id}
                        padding="sm"
                        onClick={() => handleSelect(concept.id)}
                      >
                        <Typography>{concept.title}</Typography>
                      </Card>
                    )}
                  </For>
                </Layout.Flex>
              </Accordion.Content>
            </Accordion.Item>
          )}
        </For>
      </Accordion>
    </Show>
  );
};

/** Phantom `__events` для codegen (см. `List`). На runtime не используется. */
export const Concepts: ((props: IConceptsProps) => ReturnType<typeof ConceptsComponent>) & {
  readonly __events?: IConceptsEvents;
} = ConceptsComponent;

export default Concepts;
