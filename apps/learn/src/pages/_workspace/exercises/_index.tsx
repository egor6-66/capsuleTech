/**
 * /exercises — index fallback (welcome раздела). Свапнём на `Learn.ExercisesWelcome` позже.
 */
const ExercisesHome = Page((Ui) => (
  <Ui.Layout.Flex orientation="vertical" gapY={4} class="p-6">
    <Ui.Typography variant="h1">Exercises</Ui.Typography>
    <Learn.Exercise type="fill-blank" conceptId="lang.en_US.articles" />
  </Ui.Layout.Flex>
));

export default ExercisesHome;
