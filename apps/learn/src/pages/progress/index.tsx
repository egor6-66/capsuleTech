/**
 * /progress — раздел прогресса (скелет).
 *
 * `Learn.Progress` — сводка по концептам (Leitner box'ы). Данные — с backend/learn.
 */
const ProgressPage = Page((Ui) => (
  <Ui.Layout.Flex class="min-h-screen flex-col gap-6 p-8">
    <Ui.Typography variant="h1">Progress</Ui.Typography>
    <Learn.Progress entries={[]} />
  </Ui.Layout.Flex>
));

export default ProgressPage;
