/**
 * Views.WordInfo — панель инфо о выбранном слове (чистая вёрстка: ни import'ов,
 * ни raw-class; тип = `Entities.Sense.Row`; control-flow — `Ui.Flow.*`).
 * Порядок: ориг en + 🔊 → фонетика (pron_ru) → перевод (ru) → определение en
 * (gloss) → теги → фасеты.
 *
 * SKELETON: поля list-item'а. Rich-деталь (forms/examples/связи) — след. шаг.
 */
const FACETS = ['pos', 'level', 'register', 'connotation', 'synset'] as const;

const WordInfo = View(
  ({ Layout, Typography, Card, Button, Flow }, props: { sense: Entities.Sense.Row | null }) => (
    <Flow.Show
      when={props.sense}
      fallback={
        <Layout.Flex h="full" align="center" justify="center" p={6}>
          <Typography tone="muted">Выберите слово</Typography>
        </Layout.Flex>
      }
    >
      {(sense) => (
        <Layout.Flex orientation="vertical" gapY={3} p={6}>
          <Layout.Flex orientation="horizontal" gapX={2} align="center">
            <Typography variant="h2">{sense().text}</Typography>
            <Button
              variant="ghost"
              size="sm"
              meta={{ tags: ['speak'] }}
              payload={{ audioUrl: sense().audio?.url ?? null }}
            >
              🔊
            </Button>
          </Layout.Flex>

          <Flow.Show when={sense().pron_ru}>
            <Typography tone="muted">{sense().pron_ru}</Typography>
          </Flow.Show>
          <Flow.Show when={sense().ru}>
            <Typography>{sense().ru}</Typography>
          </Flow.Show>
          <Flow.Show when={sense().gloss}>
            <Typography tone="muted">{sense().gloss}</Typography>
          </Flow.Show>

          <Layout.Flex orientation="horizontal" gapX={2} gapY={2} wrap="wrap">
            <Flow.For each={sense().tags ?? []}>
              {(t) => (
                <Card padding="sm">
                  <Typography size="sm" tone="muted">
                    {t.name} · {t.kind}
                  </Typography>
                </Card>
              )}
            </Flow.For>
          </Layout.Flex>

          <Layout.Flex orientation="vertical" gapY={1}>
            <Flow.For each={FACETS}>
              {(f) => (
                <Flow.Show when={sense()[f]}>
                  <Typography size="sm" tone="muted">
                    {f}: {sense()[f]}
                  </Typography>
                </Flow.Show>
              )}
            </Flow.For>
          </Layout.Flex>
        </Layout.Flex>
      )}
    </Flow.Show>
  ),
);

export default WordInfo;
