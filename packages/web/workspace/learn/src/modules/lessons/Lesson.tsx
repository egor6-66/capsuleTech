/**
 * Learn.Lesson — выбранный урок (`lessonsStore.current()`). Маршрут по порядку:
 * intro (проза) → концепты (принцип + markdown-тело) → правила (markdown-
 * справочник) → дриллы (интерактив). Порядок внутри каждого блока — как пришёл
 * с бэка (сохраняется). Пусто → `Placeholders.Empty`.
 *
 * Слова дриллов озвучиваются через `onSpeak { audioUrl }` — тот же канал, что
 * `Learn.Words`; плеер/движок — app-concern (пакет звук НЕ играет).
 * `useEmitOptional` — тот же контракт, что остальные connected-блоки.
 *
 * Тело (композиция concept/rule → Article, список дриллов) доводится ОТДЕЛЬНО с
 * дриллами — здесь пока прежняя ручная разметка (бриф split: только move+rename).
 *
 * Phantom `__events?: ILessonEvents` → codegen `Learn.Lesson.Events`.
 * Регистрируется как `Learn.Lesson` через `../../capsule` (ADR 033).
 */
import { useEmitOptional } from '@capsuletech/web-core';
import { Empty } from '@capsuletech/web-placeholders';
import { Layout } from '@capsuletech/web-ui/layout';
import { Typography } from '@capsuletech/web-ui/typography';
import { For, Show } from 'solid-js';
import { useApiBase } from '../../core/apiContext';
import { Markdown } from '../../shared/markdown';
import { Drill } from '../drills';
import { lessonsStore } from './store';

export interface ILessonProps {
  class?: string;
}

export interface ILessonEvents {
  onSpeak: { audioUrl: string | null };
}

const LessonComponent = (props: ILessonProps) => {
  const apiBase = useApiBase();
  const emit = useEmitOptional();

  const handleSpeak = (audioUrl: string | null) => {
    emit('onSpeak', { source: 'Learn.Lesson', payload: { audioUrl } });
  };

  return (
    <Show when={lessonsStore.current()} fallback={<Empty title="Выберите урок" />}>
      {(lesson) => (
        <Layout.Flex orientation="vertical" gapY={4} p={6} class={props.class}>
          <Typography variant="h1">{lesson().title}</Typography>

          <Show when={lesson().intro}>{(intro) => <Markdown body={intro()} />}</Show>

          <For each={lesson().concepts}>
            {(concept) => (
              <Layout.Flex orientation="vertical" gapY={1}>
                <Typography variant="h2">{concept.title}</Typography>
                <Show when={concept.principle}>
                  <Typography tone="muted">{concept.principle}</Typography>
                </Show>
                <Markdown body={concept.body} />
              </Layout.Flex>
            )}
          </For>

          <For each={lesson().rules}>
            {(rule) => (
              <Layout.Flex orientation="vertical" gapY={1}>
                <Typography variant="h2">{rule.title}</Typography>
                <Markdown body={rule.body} />
              </Layout.Flex>
            )}
          </For>

          <For each={lesson().drills}>
            {(drill) => <Drill drill={drill} apiBase={apiBase} onSpeak={handleSpeak} />}
          </For>
        </Layout.Flex>
      )}
    </Show>
  );
};

/** Phantom `__events` для codegen. На runtime не используется. */
export const Lesson: ((props: ILessonProps) => ReturnType<typeof LessonComponent>) & {
  readonly __events?: ILessonEvents;
} = LessonComponent;

export default Lesson;
