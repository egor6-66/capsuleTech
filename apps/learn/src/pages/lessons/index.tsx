/**
 * /lessons — раздел уроков (скелет).
 *
 * Раскидывает блоки пакета: `Learn.LessonView` (показ концепта) + lang-специфичный
 * `Learn.SentenceBuilder`. Контент сейчас — плейсхолдеры; реальные концепты придут
 * с backend/learn (ADR 055).
 */
const Lessons = Page((Ui) => (
  <Ui.Layout.Flex class="min-h-screen flex-col gap-6 p-8">
    <Ui.Typography variant="h1">Lessons</Ui.Typography>
    <Learn.LessonView conceptId="lang.en_US.articles" />
    <Learn.SentenceBuilder words={['I', 'saw', 'a', 'dog']} />
  </Ui.Layout.Flex>
));

export default Lessons;
