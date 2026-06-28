/**
 * /workspace/exercises — раздел упражнений (скелет).
 * `Learn.Exercise` диспатчит по типу. Проверка ответов — через backend/learn (позже).
 */
const Exercises = Page((Ui) => (
  <Ui.Layout.Flex class="min-h-full flex-col gap-6 p-8">
    <Ui.Typography variant="h1">Exercises</Ui.Typography>
    <Learn.Exercise type="fill-blank" conceptId="lang.en_US.articles" />
  </Ui.Layout.Flex>
));

export default Exercises;
