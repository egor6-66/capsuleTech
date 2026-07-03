/**
 * Views.WordSearch — поисковая строка библиотеки слов. Пока только Input
 * (`meta 'search'` → Features.Library ловит onInput); фильтры и прочие
 * контролы поиска добавляются сюда же, Widget не разрастается.
 */
const WordSearch = View(({ Input, Layout }) => (
  <Layout.Flex p={1}>
    <Input meta={{ tags: ['search'] }} placeholder="Поиск слова…" />
  </Layout.Flex>
));

export default WordSearch;
