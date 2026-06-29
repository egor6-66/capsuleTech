/**
 * /lessons — index fallback (welcome раздела).
 * Пока текущий контент; свапнём на `Learn.LessonsWelcome`, когда пакет добавит.
 */
const LessonsHome = Page((Ui) => (
  <Ui.Layout.Flex orientation="vertical" gapY={4} class="p-6">
    <Ui.Typography variant="h1">Lessons</Ui.Typography>
    <Learn.LessonView conceptId="lang.en_US.articles" />
    <Learn.SentenceBuilder words={['I', 'saw', 'a', 'dog']} />
  </Ui.Layout.Flex>
));

export default LessonsHome;
