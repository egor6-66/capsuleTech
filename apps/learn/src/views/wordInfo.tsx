/**
 * Views.WordInfo — панель инфо о выбранном слове (чистая вёрстка). Данные — от
 * Widgets.Library.WordInfo (выбранный sense из Features.Library). Пустые поля прячем.
 *
 * SKELETON: показывает поля из list-item (text/pron_ru/gloss/level/register/connotation/
 * synset/tags). Rich-деталь (forms/examples/связи) + контролы «что показать» — след. шаг.
 */
import { For, Show } from 'solid-js';

interface IWordInfoProps {
  sense: any | null;
  engine: string;
}

const WordInfo = View(({ Layout, Typography, Card, Button }, props: IWordInfoProps) => (
  <Show
    when={props.sense}
    fallback={
      <Layout.Flex h="full" align="center" justify="center">
        <Typography tone="muted">Выберите слово</Typography>
      </Layout.Flex>
    }
  >
    <Layout.Flex orientation="vertical" gapY={3} class="p-6">
      <Layout.Flex orientation="horizontal" gapX={2} align="center">
        <Typography variant="h2">{props.sense.text}</Typography>
        <Button
          variant="ghost"
          meta={{ tags: ['speak'] }}
          payload={{ audioUrl: props.sense.audio?.url ?? null }}
        >
          🔊
        </Button>
      </Layout.Flex>

      {/* Свитчер TTS-движка — A/B озвучки (применяется ко всем 🔊). Список движков
          приходит в audio-блоке learn-композиции (ADR 067) — не хардкодим. */}
      <Layout.Flex orientation="horizontal" gapX={1}>
        <For each={props.sense.audio?.engines ?? []}>
          {(e) => (
            <Button
              variant="ghost"
              meta={{ tags: ['engine'] }}
              payload={{ setEngine: e }}
              aria-selected={props.engine === e}
              class="px-2 text-xs aria-[selected=true]:bg-primary aria-[selected=true]:text-primary-foreground"
            >
              {e}
            </Button>
          )}
        </For>
      </Layout.Flex>

      <Show when={props.sense.pron_ru}>
        <Typography tone="muted">{props.sense.pron_ru}</Typography>
      </Show>
      <Show when={props.sense.gloss}>
        <Typography>{props.sense.gloss}</Typography>
      </Show>

      <Layout.Flex orientation="horizontal" gapX={2} class="flex-wrap">
        <For each={props.sense.tags ?? []}>
          {(t) => (
            <Card class="px-2 py-1">
              <Typography size="sm" tone="muted">
                {t.name} · {t.kind}
              </Typography>
            </Card>
          )}
        </For>
      </Layout.Flex>

      <Layout.Flex orientation="vertical" gapY={1}>
        <Show when={props.sense.pos}>
          <Typography size="sm" tone="muted">
            pos: {props.sense.pos}
          </Typography>
        </Show>
        <Show when={props.sense.level}>
          <Typography size="sm" tone="muted">
            level: {props.sense.level}
          </Typography>
        </Show>
        <Show when={props.sense.register}>
          <Typography size="sm" tone="muted">
            register: {props.sense.register}
          </Typography>
        </Show>
        <Show when={props.sense.connotation}>
          <Typography size="sm" tone="muted">
            connotation: {props.sense.connotation}
          </Typography>
        </Show>
        <Show when={props.sense.synset}>
          <Typography size="sm" tone="muted">
            synset: {props.sense.synset}
          </Typography>
        </Show>
      </Layout.Flex>
    </Layout.Flex>
  </Show>
));

export default WordInfo;
