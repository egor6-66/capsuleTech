/**
 * /workspace/guides — in-app tour'ы (скелет).
 */
const Guides = Page((Ui) => (
  <Ui.Layout.Flex class="min-h-full flex-col gap-6 p-8">
    <Ui.Typography variant="h1">Guides</Ui.Typography>
    <Learn.Tour guideId="intro" />
  </Ui.Layout.Flex>
));

export default Guides;
