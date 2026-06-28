/**
 * /workspace/lessons — раздел уроков (скелет).
 * Блоки пакета: `Learn.LessonView` + lang-специфичный `Learn.SentenceBuilder`.
 */
const Lessons = Page((Ui) => (
  <Ui.Layout.Flex class="min-h-full flex-col gap-6 p-8">
    <Ui.Typography variant="h1">Lessons</Ui.Typography>
    <Learn.LessonView conceptId="lang.en_US.articles" />
    <Learn.SentenceBuilder words={['I', 'saw', 'a', 'dog']} />
  </Ui.Layout.Flex>
));

export default Lessons;
