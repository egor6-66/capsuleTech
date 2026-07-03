/**
 * Views.WordList — сетка слов (чистая вёрстка). Данными кормит Widgets.Library.Words.
 *
 * Тайлы flex-wrap: каждая ячейка = слово + перевод, под размер контента. Тайл несёт
 * `meta`+`payload={ id }` → UiProxy биндит клик → Features.Library.onClick селектит.
 * Поиск-input (meta 'search') → Features.Library.onInput.
 */
import { For } from 'solid-js';

interface ITile {
  id: number;
  text: string;
  translation: string | null;
  audioUrl: string | null;
}

interface IWordListProps {
  words: ITile[];
  selectedId: number | null;
}

const WordList = View(({ Layout, Card, Typography, Input, Button }, props: IWordListProps) => (
  <Layout.Flex orientation="vertical" gapY={1} h="full">
    <Layout.Flex class={'p-1 pb-0'}>
      <Input meta={{ tags: ['search'] }} placeholder="Поиск слова…" />
    </Layout.Flex>
    <Layout.Flex
      orientation="horizontal"
      gapX={2}
      gapY={2}
      class="flex-wrap content-start overflow-auto"
      justify={'center'}
    >
      <For each={props.words} fallback={<Typography tone="muted">Ничего не найдено</Typography>}>
        {(w) => (
          <Card
            meta={{ tags: ['word'] }}
            payload={{ id: w.id }}
            role="button"
            tabIndex={0}
            aria-selected={props.selectedId === w.id}
            class="cursor-pointer px-2 py-1 transition-colors hover:bg-accent aria-[selected=true]:bg-primary aria-[selected=true]:text-primary-foreground"
          >
            <Layout.Flex align={'center'}>
              <Typography align={'center'}>{w.text}</Typography>
              <Button
                variant="ghost"
                meta={{ tags: ['speak'] }}
                payload={{ audioUrl: w.audioUrl }}
                class="h-5 px-1 text-xs"
              >
                🔊
              </Button>
            </Layout.Flex>

            <Typography tone="muted" size="sm" align={'center'}>
              {w.translation}
            </Typography>
          </Card>
        )}
      </For>
    </Layout.Flex>
  </Layout.Flex>
));

export default WordList;
