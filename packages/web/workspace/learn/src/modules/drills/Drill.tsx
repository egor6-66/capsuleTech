/**
 * Drill — internal-интерактив дрилла (building-block `Lesson`/`RuleDrills`,
 * отдельно НЕ регистрируется). Каждый item: `promptRu` (+`context`) → Input +
 * «Проверить» → вердикт (✅ / хинт near_miss / «мимо» wrong); «Показать ответ»
 * = reveal. Ключ ответа на бэке — фронт только показывает то, что вернул чекер.
 *
 * Слова дрилла (`words_resolved`) — 🔊 через `onSpeak`-колбэк (проброшен из
 * `Lesson`/`RuleDrills`, канал `onSpeak { audioUrl }`; плеер/движок — app-concern).
 *
 * Состояние ответов/вердиктов — в `drillsStore` (эфемерно, per item).
 */
import { Badge } from '@capsuletech/web-ui/badge';
import { Button } from '@capsuletech/web-ui/button';
import { Input } from '@capsuletech/web-ui/input';
import { Layout } from '@capsuletech/web-ui/layout';
import { Typography } from '@capsuletech/web-ui/typography';
import { For, Show } from 'solid-js';
import { drillsStore } from './store';
import type { IDrill, IResolvedWord } from './types';

export interface IDrillProps {
  drill: IDrill;
  apiBase: string;
  onSpeak: (audioUrl: string | null) => void;
}

const VERDICT_LABEL: Record<string, string> = {
  correct: '✅ Верно',
  wrong: 'Мимо',
};

// Слово-чип = статический `Ui.Badge` (текст + перевод); 🔊 — ОТДЕЛЬНАЯ speak-кнопка
// рядом, не сливаем в чип (чип не кликабелен — единственное действие = проговорить).
const WordChip = (props: { word: IResolvedWord; onSpeak: (audioUrl: string | null) => void }) => (
  <Layout.Flex orientation="horizontal" gapX={1} align="center">
    <Badge tone="muted">
      {props.word.text}
      <Show when={props.word.ru}> · {props.word.ru}</Show>
    </Badge>
    <Button variant="ghost" size="xs" onClick={() => props.onSpeak(props.word.audio?.url ?? null)}>
      🔊
    </Button>
  </Layout.Flex>
);

export const Drill = (props: IDrillProps) => (
  <Layout.Flex orientation="vertical" gapY={2}>
    <Typography variant="h2">{props.drill.title}</Typography>

    <Show when={props.drill.words_resolved.length > 0}>
      <Layout.Flex orientation="horizontal" gapX={1} gapY={1} wrap="wrap">
        <For each={props.drill.words_resolved}>
          {(word) => <WordChip word={word} onSpeak={props.onSpeak} />}
        </For>
      </Layout.Flex>
    </Show>

    <For each={props.drill.items}>
      {(item) => {
        const verdict = () => drillsStore.verdict(props.drill.id, item.index);
        const submit = (reveal: boolean) =>
          void drillsStore.check(props.apiBase, props.drill.id, item.index, reveal);

        return (
          <Layout.Flex orientation="vertical" gapY={1}>
            <Typography>{item.promptRu}</Typography>
            <Show when={item.context}>
              <Typography size="sm" tone="muted">
                {item.context}
              </Typography>
            </Show>

            <Layout.Flex orientation="horizontal" gapX={1} align="center">
              <Input
                value={drillsStore.answer(props.drill.id, item.index)}
                placeholder="Ваш ответ…"
                onInput={(e) =>
                  drillsStore.setAnswer(props.drill.id, item.index, e.currentTarget.value)
                }
              />
              <Button
                size="sm"
                disabled={drillsStore.checking(props.drill.id, item.index)}
                onClick={() => submit(false)}
              >
                Проверить
              </Button>
              <Button variant="ghost" size="sm" onClick={() => submit(true)}>
                Показать ответ
              </Button>
            </Layout.Flex>

            <Show when={verdict()}>
              {(v) => (
                <Layout.Flex orientation="vertical" gapY={0}>
                  <Typography size="sm" tone={v().verdict === 'correct' ? undefined : 'muted'}>
                    {v().verdict === 'near_miss'
                      ? `Почти: ${v().hint ?? ''}`
                      : (VERDICT_LABEL[v().verdict] ?? v().verdict)}
                  </Typography>
                  <Show when={v().answer}>
                    <Typography size="sm">Ответ: {v().answer}</Typography>
                  </Show>
                </Layout.Flex>
              )}
            </Show>
          </Layout.Flex>
        );
      }}
    </For>
  </Layout.Flex>
);

export default Drill;
