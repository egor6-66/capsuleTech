/**
 * /exercises — раздел упражнений (скелет).
 *
 * `Learn.Exercise` диспатчит по `type` на под-стабы (fill-blank/build-clause/…).
 * Реальная проверка ответов — через backend/learn → lang (ADR 055 D2).
 */
const Exercises = Page((Ui) => (
  <Ui.Layout.Flex class="min-h-screen flex-col gap-6 p-8">
    <Ui.Typography variant="h1">Exercises</Ui.Typography>
    <Learn.Exercise type="fill-blank" conceptId="lang.en_US.articles" />
  </Ui.Layout.Flex>
));

export default Exercises;
