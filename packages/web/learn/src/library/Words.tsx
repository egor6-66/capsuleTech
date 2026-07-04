/**
 * Learn.Library.Words — сетка тайлов словаря. Читает `libraryStore.senses()`;
 * lazy-load при первом монтировании (пустой стор — зеркало исходного
 * `Features.Library.onInit`). Клик тайла → `libraryStore.select(id)` +
 * emit `onWordSelect`; клик 🔊 → emit `onSpeak` (плеер/движок — app-concern,
 * пакет звук НЕ играет).
 *
 * `useEmitOptional` (не `useEmit`) — блок может рендериться вне
 * Controller/Feature-scope (unit-тесты, будущие standalone-превью); emit
 * тихо no-op'ится вне scope.
 *
 * Phantom `__events?: IWordsEvents` → codegen `Learn.Library.Words.Events`.
 * Регистрируется как `Learn.Library.Words` через `../capsule` (ADR 033).
 */
import { useEmitOptional } from '@capsuletech/web-core';
import { Layout } from '@capsuletech/web-ui/layout';
import { For, onMount } from 'solid-js';
import { useApiBase } from '../core/apiContext';
import { libraryStore } from './store';
import type { ISense } from './types';
import { WordTile } from './WordTile';

export interface IWordsProps {
  class?: string;
}

export interface IWordsEvents {
  onWordSelect: { sense: ISense };
  onSpeak: { audioUrl: string | null };
}

const WordsComponent = (props: IWordsProps) => {
  const apiBase = useApiBase();
  const emit = useEmitOptional();

  onMount(() => {
    if (libraryStore.senses().length === 0) void libraryStore.load(apiBase);
  });

  const handleSelect = (id: number) => {
    libraryStore.select(id);
    const sense = libraryStore.senses().find((s) => s.id === id);
    if (sense) emit('onWordSelect', { source: 'Learn.Library.Words', payload: { sense } });
  };

  const handleSpeak = (audioUrl: string | null) => {
    emit('onSpeak', { source: 'Learn.Library.Words', payload: { audioUrl } });
  };

  return (
    <Layout.Flex
      orientation="horizontal"
      gapX={1}
      gapY={1}
      wrap="wrap"
      justify="center"
      p={1}
      class={props.class}
    >
      <For each={libraryStore.senses()}>
        {(sense) => (
          <WordTile
            sense={sense}
            selected={libraryStore.selectedId() === sense.id}
            onSelect={handleSelect}
            onSpeak={handleSpeak}
          />
        )}
      </For>
    </Layout.Flex>
  );
};

/**
 * Phantom `__events?: IWordsEvents` нужен codegen-у для `Learn.Library.Words.Events`
 * (namespace-merge). На runtime не используется.
 */
export const Words: ((props: IWordsProps) => ReturnType<typeof WordsComponent>) & {
  readonly __events?: IWordsEvents;
} = WordsComponent;

export default Words;
