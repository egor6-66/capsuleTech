/**
 * Views.Library.Explorer — placeholder word-explorer (stateless).
 *
 * Визуальный шелл будущего лексического эксплорера (ADR 064): поиск слова →
 * дефолт-мета → тогглы раскрывают синонимы/конструкции/фонетику/близкие слова.
 * Пока статичный плейсхолдер, данные позже придут с backend/learn через Widget.
 *
 * КАНОН: View stateless — только Ui-примитивы + props, без XState/API/router.
 * РАСЧЁТ: этот View позже переедет в `@capsuletech/web-learn/library` как
 * `Learn.WordExplorer` — поэтому держим его чистым (никаких app-глобалов внутри).
 */
const Explorer = View(({ Layout, Card, Typography, Input, Button }) => (
  <Card class="w-full max-w-3xl">
    <Card.Header>
      <Card.Title>Word Explorer</Card.Title>
      <Card.Description>
        Поиск слова → дефолт-мета; тогглами раскрываешь синонимы, конструкции, фонетику, близкие слова.
      </Card.Description>
    </Card.Header>

    <Layout.Flex orientation="vertical" gapY={4} class="px-6 pb-6">
      <Input placeholder="Найти слово…" disabled />

      <Layout.Flex orientation="horizontal" gapX={2} class="flex-wrap">
        <Button disabled>Synonyms</Button>
        <Button disabled>Constructions</Button>
        <Button disabled>Phonetics</Button>
        <Button disabled>Related</Button>
      </Layout.Flex>

      <Layout.Flex orientation="vertical" align="center" justify="center" gapY={1} class="py-16">
        <Typography tone="muted">Выберите слово, чтобы увидеть детали</Typography>
        <Typography tone="muted" size="sm">placeholder — данные подтянем с backend/learn</Typography>
      </Layout.Flex>
    </Layout.Flex>
  </Card>
));

export default Explorer;
