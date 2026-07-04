/**
 * WordTile — один тайл слова библиотечной сетки (internal building block
 * `Words`, не регистрируется отдельно). Перенос вёрстки app-слоя 1-в-1
 * (была `apps/learn/src/views/wordTile.tsx`): сверху ориг en + 🔊, ниже
 * фонетика (pron_ru), ниже перевод (ru).
 *
 * `onSpeak` — `stopPropagation` на кнопке 🔊, иначе клик всплывает и на
 * Card (native DOM bubbling, тут нет UiProxy dedup-механики app-слоя).
 */
import { Button } from '@capsuletech/web-ui/button';
import { Card } from '@capsuletech/web-ui/card';
import { Layout } from '@capsuletech/web-ui/layout';
import { Typography } from '@capsuletech/web-ui/typography';
import { Show } from 'solid-js';
import type { ISense } from './types';

export interface IWordTileProps {
  sense: ISense;
  selected: boolean;
  onSelect: (id: number) => void;
  onSpeak: (audioUrl: string | null) => void;
}

export const WordTile = (props: IWordTileProps) => (
  <Card
    role="button"
    tabIndex={0}
    interactive
    selected={props.selected}
    padding="sm"
    onClick={() => props.onSelect(props.sense.id)}
  >
    <Layout.Flex orientation="vertical" gapY={0}>
      <Layout.Flex orientation="horizontal" gapX={1} align="center">
        <Typography align="center">{props.sense.text}</Typography>
        <Button
          variant="ghost"
          size="xs"
          onClick={(e) => {
            e.stopPropagation();
            props.onSpeak(props.sense.audio?.url ?? null);
          }}
        >
          🔊
        </Button>
      </Layout.Flex>

      <Show when={props.sense.pron_ru}>
        <Typography tone="muted" size="sm" align="center">
          {props.sense.pron_ru}
        </Typography>
      </Show>

      <Show when={props.sense.ru}>
        <Typography size="sm" align="center">
          {props.sense.ru}
        </Typography>
      </Show>
    </Layout.Flex>
  </Card>
);

export default WordTile;
