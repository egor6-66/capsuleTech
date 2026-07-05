/**
 * Learn.Lessons.Rule — выбранное правило (`lessonsStore.currentRule()`):
 * title → markdown-справочник (`Markdown` → `Prose`) → секция «Практика» с
 * ЕГО дриллами. Дриллы переиспользуют существующий `Drill` как есть (чекер
 * глобален в `lessonsStore`, item'ы санитизированы бэком). Fallback до выбора.
 *
 * Слова дриллов озвучиваются через `onSpeak { audioUrl }` — тот же канал, что
 * `Learn.Lessons.View` / `Learn.Library.*`; плеер/движок — app-concern.
 * `useEmitOptional` — тот же контракт, что остальные connected-блоки.
 *
 * Phantom `__events?: IRuleEvents` → codegen `Learn.Lessons.Rule.Events`.
 * Регистрируется как `Learn.Lessons.Rule` через `../capsule` (ADR 033).
 */
import { useEmitOptional } from '@capsuletech/web-core';
import { Layout } from '@capsuletech/web-ui/layout';
import { Typography } from '@capsuletech/web-ui/typography';
import { For, Show } from 'solid-js';
import { useApiBase } from '../core/apiContext';
import { Drill } from './Drill';
import { Markdown } from './Markdown';
import { lessonsStore } from './store';

export interface IRuleProps {
  class?: string;
}

export interface IRuleEvents {
  onSpeak: { audioUrl: string | null };
}

const RuleComponent = (props: IRuleProps) => {
  const apiBase = useApiBase();
  const emit = useEmitOptional();

  const handleSpeak = (audioUrl: string | null) => {
    emit('onSpeak', { source: 'Learn.Lessons.Rule', payload: { audioUrl } });
  };

  return (
    <Show
      when={lessonsStore.currentRule()}
      fallback={
        <Layout.Flex h="full" align="center" justify="center" p={6} class={props.class}>
          <Typography tone="muted">Выберите правило</Typography>
        </Layout.Flex>
      }
    >
      {(rule) => (
        <Layout.Flex orientation="vertical" gapY={4} p={6} class={props.class}>
          <Typography variant="h1">{rule().title}</Typography>

          <Markdown body={rule().body} />

          <Show when={rule().drills.length > 0}>
            <Layout.Flex orientation="vertical" gapY={3}>
              <Typography variant="h2">Практика</Typography>
              <For each={rule().drills}>
                {(drill) => <Drill drill={drill} apiBase={apiBase} onSpeak={handleSpeak} />}
              </For>
            </Layout.Flex>
          </Show>
        </Layout.Flex>
      )}
    </Show>
  );
};

/** Phantom `__events` для codegen (см. `View`). На runtime не используется. */
export const Rule: ((props: IRuleProps) => ReturnType<typeof RuleComponent>) & {
  readonly __events?: IRuleEvents;
} = RuleComponent;

export default Rule;
