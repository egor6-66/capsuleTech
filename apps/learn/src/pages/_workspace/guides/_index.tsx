/**
 * /guides — index fallback (welcome раздела). Свапнём на `Learn.GuidesWelcome` позже.
 */
const GuidesHome = Page((Ui) => (
  <Ui.Layout.Flex orientation="vertical" gapY={4} class="p-6">
    <Ui.Typography variant="h1">Guides</Ui.Typography>
    <Learn.Tour guideId="intro" />
  </Ui.Layout.Flex>
));

export default GuidesHome;
