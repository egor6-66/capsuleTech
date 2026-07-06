/**
 * Learn.Words — сетка тайлов словаря на `Ui.List` (batch `wrap`-грид,
 * ADR 036): `data` = стор sense'ов, `item.use` = `WordTile`. Lazy-load при
 * первом монтировании (пустой стор). Клик тайла → `wordsStore.select(id)` +
 * emit `onWordSelect`; клик 🔊 → emit `onSpeak` (плеер/движок — app-concern,
 * пакет звук НЕ играет).
 *
 * Атом `shared/words/` — список слов переиспользуется многими модулями
 * (контент library ИЛИ быстрый выбор в любом разделе), не собственность
 * `library`. Промоутнут `Learn.Library.Words` → `Learn.Words`.
 *
 * `useEmitOptional` (не `useEmit`) — блок может рендериться вне
 * Controller/Feature-scope (unit-тесты, будущие standalone-превью); emit
 * тихо no-op'ится вне scope.
 *
 * Phantom `__events?: IWordsEvents` → codegen `Learn.Words.Events`.
 * Регистрируется как `Learn.Words` через `../../capsule` (ADR 033).
 */
import { useEmitOptional } from '@capsuletech/web-core';
import { List as UiList } from '@capsuletech/web-ui/list';
import { onMount } from 'solid-js';
import { useApiBase } from '../../core/apiContext';
import { wordsStore } from './store';
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
    if (wordsStore.senses().length === 0) void wordsStore.load(apiBase);
  });

  const handleSelect = (id: number) => {
    wordsStore.select(id);
    const sense = wordsStore.senses().find((s) => s.id === id);
    if (sense) emit('onWordSelect', { source: 'Learn.Words', payload: { sense } });
  };

  const handleSpeak = (audioUrl: string | null) => {
    emit('onSpeak', { source: 'Learn.Words', payload: { audioUrl } });
  };

  return (
    <UiList
      wrap
      justify="center"
      class={props.class}
      data={wordsStore.senses()}
      item={{
        use: WordTile,
        props: (sense: ISense) => ({
          sense,
          selected: wordsStore.selectedId() === sense.id,
          onSelect: handleSelect,
          onSpeak: handleSpeak,
        }),
      }}
    />
  );
};

/**
 * Phantom `__events?: IWordsEvents` нужен codegen-у для `Learn.Words.Events`
 * (namespace-merge). На runtime не используется.
 */
export const Words: ((props: IWordsProps) => ReturnType<typeof WordsComponent>) & {
  readonly __events?: IWordsEvents;
} = WordsComponent;

export default Words;
