/**
 * Widgets.Library.Words — композиция библиотечной сетки (склейка ТОЛЬКО тут, канон):
 * `Views.WordSearch` (поиск, + будущие фильтры) + `Shapes.WordTiles`
 * (batch-shape тайлов; данные — senses из Features.Library через store-инжект).
 *
 * Ни одного import'а. store — 2-м аргументом виджета (канон), гард на undefined.
 */
const Words = Widget((Ui, store) => {
  const senses = () => ((store?.ctx as any)?.data?.senses as unknown[]) ?? [];
  const selectedId = () => ((store?.ctx as any)?.data?.selectedId as number | null) ?? null;

  return (
    <Ui.Layout.Flex orientation="vertical" h="full">
      <Views.WordSearch />
      <Ui.Layout.Flex orientation="vertical" overflow="auto" fluid={200} minH={0}>
        <Shapes.WordTiles data={senses()} selectedId={selectedId()} />
      </Ui.Layout.Flex>
    </Ui.Layout.Flex>
  );
});

export default Words;
