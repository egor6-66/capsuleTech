/**
 * /progress — index fallback (welcome раздела). Свапнём на `Learn.ProgressWelcome` позже.
 */
const ProgressHome = Page((Ui) => (
  <Ui.Layout.Flex orientation="vertical" gapY={4} class="p-6">
    <Ui.Typography variant="h1">Progress</Ui.Typography>
    <Learn.Progress entries={[]} />
  </Ui.Layout.Flex>
));

export default ProgressHome;
