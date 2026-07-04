/**
 * Learn.Library.Info — панель выбранного слова (`libraryStore.selected()`).
 * Перенос вёрстки app-слоя 1-в-1 (была `apps/learn/src/views/wordInfo.tsx`):
 * ориг en + 🔊 → фонетика (pron_ru) → перевод (ru) → определение en (gloss) →
 * теги → фасеты.
 *
 * `useEmitOptional` — тот же контракт, что `Words` (see IWordsEvents doc).
 * Phantom `__events?: IInfoEvents` → codegen `Learn.Library.Info.Events`.
 * Регистрируется как `Learn.Library.Info` через `../capsule` (ADR 033).
 */
import { useEmitOptional } from '@capsuletech/web-core';
import { Button } from '@capsuletech/web-ui/button';
import { Card } from '@capsuletech/web-ui/card';
import { Layout } from '@capsuletech/web-ui/layout';
import { Typography } from '@capsuletech/web-ui/typography';
import { For, Show } from 'solid-js';
import { libraryStore } from './store';

const FACETS = ['pos', 'level', 'register', 'connotation', 'synset'] as const;

export interface IInfoProps {
  class?: string;
}

export interface IInfoEvents {
  onSpeak: { audioUrl: string | null };
}

const InfoComponent = (props: IInfoProps) => {
  const emit = useEmitOptional();
  const sense = () => libraryStore.selected();

  return (
    <Show
      when={sense()}
      fallback={
        <Layout.Flex h="full" align="center" justify="center" p={6} class={props.class}>
          <Typography tone="muted">Выберите слово</Typography>
        </Layout.Flex>
      }
    >
      {(s) => (
        <Layout.Flex orientation="vertical" gapY={3} p={6} class={props.class}>
          <Layout.Flex orientation="horizontal" gapX={2} align="center">
            <Typography variant="h2">{s().text}</Typography>
            <Button
              variant="ghost"
              size="sm"
              onClick={() =>
                emit('onSpeak', {
                  source: 'Learn.Library.Info',
                  payload: { audioUrl: s().audio?.url ?? null },
                })
              }
            >
              🔊
            </Button>
          </Layout.Flex>

          <Show when={s().pron_ru}>
            <Typography tone="muted">{s().pron_ru}</Typography>
          </Show>
          <Show when={s().ru}>
            <Typography>{s().ru}</Typography>
          </Show>
          <Show when={s().gloss}>
            <Typography tone="muted">{s().gloss}</Typography>
          </Show>

          <Layout.Flex orientation="horizontal" gapX={2} gapY={2} wrap="wrap">
            <For each={s().tags ?? []}>
              {(t) => (
                <Card padding="sm">
                  <Typography size="sm" tone="muted">
                    {t.name} · {t.kind}
                  </Typography>
                </Card>
              )}
            </For>
          </Layout.Flex>

          <Layout.Flex orientation="vertical" gapY={1}>
            <For each={FACETS}>
              {(f) => (
                <Show when={s()[f]}>
                  <Typography size="sm" tone="muted">
                    {f}: {s()[f]}
                  </Typography>
                </Show>
              )}
            </For>
          </Layout.Flex>
        </Layout.Flex>
      )}
    </Show>
  );
};

export const Info: ((props: IInfoProps) => ReturnType<typeof InfoComponent>) & {
  readonly __events?: IInfoEvents;
} = InfoComponent;

export default Info;
