/**
 * /library — словарь и закладки (скелет).
 *
 * `Learn.VocabList` — список слов; bookmarking появится при наполнении.
 */
const Library = Page((Ui) => (
  <Ui.Layout.Flex class="min-h-screen flex-col gap-6 p-8">
    <Ui.Typography variant="h1">Library</Ui.Typography>
    <Learn.VocabList words={['dog', 'cat', 'house']} />
  </Ui.Layout.Flex>
));

export default Library;
