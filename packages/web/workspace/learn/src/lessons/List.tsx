/**
 * Learn.Lessons.List — список уроков на `Ui.List` (batch-режим, ADR 036):
 * `data` = стор уроков, `item.use` = `LessonCard` (title + level/tags-бейджи).
 * Lazy-load при первом монтировании (пустой стор — зеркало `Learn.Library.Words`).
 * Клик по уроку → `lessonsStore.open` (fetch урока) + emit `onLessonSelect { id }`.
 *
 * `useEmitOptional` (не `useEmit`) — блок может рендериться вне Controller/
 * Feature-scope (unit-тесты); emit тихо no-op'ится вне scope.
 *
 * Phantom `__events?: ILessonsListEvents` → codegen `Learn.Lessons.List.Events`.
 * Регистрируется как `Learn.Lessons.List` через `../capsule` (ADR 033).
 */
import { useEmitOptional } from '@capsuletech/web-core';
import { List as UiList } from '@capsuletech/web-ui/list';
import { onMount } from 'solid-js';
import { useApiBase } from '../core/apiContext';
import { LessonCard } from './LessonCard';
import { lessonsStore } from './store';
import type { ILessonSummary } from './types';

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
    <UiList
      class={props.class}
      data={lessonsStore.lessons()}
      item={{
        use: LessonCard,
        props: (lesson: ILessonSummary) => ({
          lesson,
          selected: lessonsStore.selectedId() === lesson.id,
          onSelect: handleSelect,
        }),
      }}
    />
  );
};

/** Phantom `__events` для codegen (см. `Words`). На runtime не используется. */
export const List: ((props: IListProps) => ReturnType<typeof ListComponent>) & {
  readonly __events?: ILessonsListEvents;
} = ListComponent;

export default List;
