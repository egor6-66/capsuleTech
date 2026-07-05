/**
 * Learn.Library.Info — панель выбранного слова (`wordsStore.selected()`).
 * Library-view-концерн (деталь выбранного), НЕ атом — остаётся в модуле,
 * композирует атом `shared/words/` (читает его `selected()`). Сущностный
 * `Ui.Card` (пресет-сущность, component-model canon) — та же сущность, что
 * `WordTile`, только фулл (больше слотов): en-ориг + 🔊 в titleAction,
 * фонетика (pron_ru) в subtitle, перевод (ru) в translation, определение
 * (gloss) в definition, теги, фасеты в meta. Ноль ручной вёрстки.
 *
 * `useEmitOptional` — тот же контракт, что `Words` (see IWordsEvents doc).
 * Phantom `__events?: IInfoEvents` → codegen `Learn.Library.Info.Events`.
 * Регистрируется как `Learn.Library.Info` через `../capsule` (ADR 033).
 */
import { useEmitOptional } from '@capsuletech/web-core';
import { Empty } from '@capsuletech/web-placeholders';
import { Button } from '@capsuletech/web-ui/button';
import { Card } from '@capsuletech/web-ui/card';
import { Show } from 'solid-js';
import { wordsStore } from '../../shared/words/store';

const FACETS = ['pos', 'level', 'register', 'connotation', 'synset'] as const;

export interface IInfoProps {
  class?: string;
}

export interface IInfoEvents {
  onSpeak: { audioUrl: string | null };
}

const InfoComponent = (props: IInfoProps) => {
  const emit = useEmitOptional();
  const sense = () => wordsStore.selected();

  return (
    <Show when={sense()} fallback={<Empty title="Выберите слово" />}>
      {(s) => (
        <Card
          class={props.class}
          title={s().text}
          titleAction={
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
          }
          subtitle={s().pron_ru ?? undefined}
          translation={s().ru ?? undefined}
          definition={s().gloss ?? undefined}
          tags={(s().tags ?? []).map((t) => `${t.name} · ${t.kind}`)}
          meta={FACETS.filter((f) => s()[f]).map((f) => ({ key: f, value: String(s()[f]) }))}
        />
      )}
    </Show>
  );
};

export const Info: ((props: IInfoProps) => ReturnType<typeof InfoComponent>) & {
  readonly __events?: IInfoEvents;
} = InfoComponent;

export default Info;
