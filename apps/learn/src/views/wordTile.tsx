/**
 * Views.WordTile — ОДИН тайл слова (чистая вёрстка: ни import'ов, ни raw-class —
 * только props Ui-примитивов; тип данных = `Entities.Sense.Row`, без ad-hoc
 * interface'ов). Control-flow — `Ui.Flow.*`.
 *
 * Слот (канон user 2026-07-03): сверху ориг en + 🔊, ниже фонетика (pron_ru),
 * ниже перевод (ru).
 *
 * Тайл несёт `meta`+`payload={ id }` → выбор в Features.Library; 🔊 несёт
 * `payload={ audioUrl }` (готовая ссылка learn-композиции, ADR 067) → баббл
 * до плеера в Features.App.
 *
 */
const WordTile = View(
  (
    { Layout, Card, Typography, Button, Flow },
    props: { sense: Entities.Sense.Row; selected: boolean },
  ) => (
    <Card
      meta={{ tags: ['word'] }}
      payload={{ id: props.sense.id }}
      role="button"
      tabIndex={0}
      interactive
      selected={props.selected}
      padding="sm"
    >
      <Layout.Flex orientation="vertical" gapY={0}>
        <Layout.Flex orientation="horizontal" gapX={1} align="center" justify="center">
          <Typography align="center">{props.sense.text}</Typography>
          <Button
            variant="ghost"
            size="xs"
            meta={{ tags: ['speak'] }}
            payload={{ audioUrl: props.sense.audio?.url ?? null }}
          >
            🔊
          </Button>
        </Layout.Flex>

        <Flow.Show when={props.sense.pron_ru}>
          <Typography tone="muted" size="sm" align="center">
            {props.sense.pron_ru}
          </Typography>
        </Flow.Show>

        <Flow.Show when={props.sense.ru}>
          <Typography size="sm" align="center">
            {props.sense.ru}
          </Typography>
        </Flow.Show>
      </Layout.Flex>
    </Card>
  ),
);

export default WordTile;
