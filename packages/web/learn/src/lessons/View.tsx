/**
 * Learn.Lessons.View — выбранный урок (`lessonsStore.current()`). Маршрут по
 * порядку: intro (проза) → концепты (принцип + markdown-тело) → правила
 * (markdown-справочник) → дриллы (интерактив). Порядок внутри каждого блока —
 * как пришёл с бэка (сохраняется).
 *
 * Слова дриллов озвучиваются через `onSpeak { audioUrl }` — тот же канал, что
 * `Learn.Library.*`; плеер/движок — app-concern (пакет звук НЕ играет).
 * `useEmitOptional` — тот же контракт, что `library` блоки.
 *
 * Phantom `__events?: ILessonsViewEvents` → codegen `Learn.Lessons.View.Events`.
 * Регистрируется как `Learn.Lessons.View` через `../capsule` (ADR 033).
 */
import { useEmitOptional } from '@capsuletech/web-core';
import { Layout } from '@capsuletech/web-ui/layout';
import { Typography } from '@capsuletech/web-ui/typography';
import { For, Show } from 'solid-js';
import { useApiBase } from '../core/apiContext';
import { Drill } from './Drill';
import { Markdown } from './Markdown';
import { lessonsStore } from './store';

export interface IViewProps {
  class?: string;
}

export interface ILessonsViewEvents {
  onSpeak: { audioUrl: string | null };
}

const ViewComponent = (props: IViewProps) => {
  const apiBase = useApiBase();
  const emit = useEmitOptional();

  const handleSpeak = (audioUrl: string | null) => {
    emit('onSpeak', { source: 'Learn.Lessons.View', payload: { audioUrl } });
  };

  return (
    <Show
      when={lessonsStore.current()}
      fallback={
        <Layout.Flex h="full" align="center" justify="center" p={6} class={props.class}>
          <Typography tone="muted">Выберите урок</Typography>
        </Layout.Flex>
      }
    >
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

/** Phantom `__events` для codegen (см. `Words`). На runtime не используется. */
export const View: ((props: IViewProps) => ReturnType<typeof ViewComponent>) & {
  readonly __events?: ILessonsViewEvents;
} = ViewComponent;

export default View;
