/**
 * Learn.Lessons — список уроков на `Ui.List` (batch-режим, ADR 036): `data` =
 * стор уроков, `item.use` = `LessonCard` (title + level/tags-бейджи). Lazy-load
 * при первом монтировании (пустой стор — зеркало `Learn.Words`). Клик по уроку
 * → `lessonsStore.open` (fetch урока) + emit `onLessonSelect { id }`.
 *
 * `useEmitOptional` (не `useEmit`) — блок может рендериться вне Controller/
 * Feature-scope (unit-тесты); emit тихо no-op'ится вне scope.
 *
 * Phantom `__events?: ILessonsEvents` → codegen `Learn.Lessons.Events`.
 * Регистрируется как `Learn.Lessons` через `../../capsule` (ADR 033).
 */
import { useEmitOptional } from '@capsuletech/web-core';
import { List as UiList } from '@capsuletech/web-ui/list';
import { onMount } from 'solid-js';
import { useApiBase } from '../../core/apiContext';
import { LessonCard } from './LessonCard';
import { lessonsStore } from './store';
import type { ILessonSummary } from './types';

export interface ILessonsProps {
  class?: string;
}

export interface ILessonsEvents {
  onLessonSelect: { id: string };
}

const LessonsComponent = (props: ILessonsProps) => {
  const apiBase = useApiBase();
  const emit = useEmitOptional();

  onMount(() => {
    if (lessonsStore.lessons().length === 0) void lessonsStore.loadList(apiBase);
  });

  const handleSelect = (id: string) => {
    void lessonsStore.open(apiBase, id);
    emit('onLessonSelect', { source: 'Learn.Lessons', payload: { id } });
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

/** Phantom `__events` для codegen. На runtime не используется. */
export const Lessons: ((props: ILessonsProps) => ReturnType<typeof LessonsComponent>) & {
  readonly __events?: ILessonsEvents;
} = LessonsComponent;

export default Lessons;
