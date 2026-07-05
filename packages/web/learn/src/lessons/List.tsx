/**
 * Learn.Lessons.List — список уроков (title, level-бейдж, tags). Lazy-load при
 * первом монтировании (пустой стор — зеркало `Learn.Library.Words`). Клик по
 * уроку → `lessonsStore.open` (fetch урока) + emit `onLessonSelect { id }`.
 *
 * `useEmitOptional` (не `useEmit`) — блок может рендериться вне Controller/
 * Feature-scope (unit-тесты); emit тихо no-op'ится вне scope.
 *
 * Phantom `__events?: ILessonsListEvents` → codegen `Learn.Lessons.List.Events`.
 * Регистрируется как `Learn.Lessons.List` через `../capsule` (ADR 033).
 */
import { useEmitOptional } from '@capsuletech/web-core';
import { Card } from '@capsuletech/web-ui/card';
import { Layout } from '@capsuletech/web-ui/layout';
import { Typography } from '@capsuletech/web-ui/typography';
import { For, onMount, Show } from 'solid-js';
import { useApiBase } from '../core/apiContext';
import { lessonsStore } from './store';

export interface IListProps {
  class?: string;
}

export interface ILessonsListEvents {
  onLessonSelect: { id: string };
}

const ListComponent = (props: IListProps) => {
  const apiBase = useApiBase();
  const emit = useEmitOptional();

  onMount(() => {
    if (lessonsStore.lessons().length === 0) void lessonsStore.loadList(apiBase);
  });

  const handleSelect = (id: string) => {
    void lessonsStore.open(apiBase, id);
    emit('onLessonSelect', { source: 'Learn.Lessons.List', payload: { id } });
  };

  return (
    <Layout.Flex orientation="vertical" gapY={1} p={1} class={props.class}>
      <For each={lessonsStore.lessons()}>
        {(lesson) => (
          <Card
            role="button"
            tabIndex={0}
            interactive
            selected={lessonsStore.selectedId() === lesson.id}
            padding="sm"
            onClick={() => handleSelect(lesson.id)}
          >
            <Layout.Flex orientation="vertical" gapY={1}>
              <Layout.Flex orientation="horizontal" gapX={2} align="center">
                <Typography>{lesson.title}</Typography>
                <Show when={lesson.level}>
                  <Card padding="sm">
                    <Typography size="sm" tone="muted">
                      {lesson.level}
                    </Typography>
                  </Card>
                </Show>
              </Layout.Flex>

              <Show when={lesson.tags.length > 0}>
                <Layout.Flex orientation="horizontal" gapX={1} gapY={1} wrap="wrap">
                  <For each={lesson.tags}>
                    {(tag) => (
                      <Typography size="sm" tone="muted">
                        #{tag}
                      </Typography>
                    )}
                  </For>
                </Layout.Flex>
              </Show>
            </Layout.Flex>
          </Card>
        )}
      </For>
    </Layout.Flex>
  );
};

/** Phantom `__events` для codegen (см. `Words`). На runtime не используется. */
export const List: ((props: IListProps) => ReturnType<typeof ListComponent>) & {
  readonly __events?: ILessonsListEvents;
} = ListComponent;

export default List;
