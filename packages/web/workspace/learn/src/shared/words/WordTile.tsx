/**
 * WordTile — один тайл слова сетки (internal building block `Words`, не
 * регистрируется отдельно). Сущностный `Ui.Card` (пресет-сущность,
 * component-model canon): только данные по слотам, ноль ручной вёрстки —
 * en-ориг в title + 🔊 в titleAction, фонетика (pron_ru) в subtitle, перевод
 * (ru) в translation. `align="center"` — тайл сетки. Роль/клавиатура вшиты в
 * Card (interactive + onClick → role=button + Enter/Space).
 *
 * `onSpeak` — `stopPropagation` на кнопке 🔊, иначе клик всплывает и на
 * Card (native DOM bubbling, тут нет UiProxy dedup-механики app-слоя).
 */
import { Button } from '@capsuletech/web-ui/button';
import { Card } from '@capsuletech/web-ui/card';
import type { ISense } from './types';

export interface IWordTileProps {
  sense: ISense;
  selected: boolean;
  onSelect: (id: number) => void;
  onSpeak: (audioUrl: string | null) => void;
}

export const WordTile = (props: IWordTileProps) => (
  <Card
    interactive
    selected={props.selected}
    onClick={() => props.onSelect(props.sense.id)}
    align="center"
    title={props.sense.text}
    padding={'sm'}
    titleAction={
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
    }
    subtitle={props.sense.pron_ru ?? undefined}
    translation={props.sense.ru ?? undefined}
  />
);

export default WordTile;
