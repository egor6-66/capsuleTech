/**
 * /library — лексическая библиотека (word-explorer).
 *
 * Тянет `Widgets.Library.Explorer` (пока placeholder-шелл). View внутри позже
 * переедет в `@capsuletech/web-learn/library`; данные — с backend/learn (ADR 064).
 */
const Library = Page((Ui) => (
  <Ui.Layout.Flex orientation="vertical" align="center" gapY={6} class="min-h-screen p-8">
    <Ui.Typography variant="h1">Library</Ui.Typography>
    <Widgets.Library.Explorer />
  </Ui.Layout.Flex>
));

export default Library;
