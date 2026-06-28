/**
 * /workspace/progress — раздел прогресса (скелет).
 */
const ProgressPage = Page((Ui) => (
  <Ui.Layout.Flex class="min-h-full flex-col gap-6 p-8">
    <Ui.Typography variant="h1">Progress</Ui.Typography>
    <Learn.Progress entries={[]} />
  </Ui.Layout.Flex>
));

export default ProgressPage;
