/**
 * /library/explorer — сетка слов (поиск + плитка) из пакетных блоков
 * `Learn.Search` / `Learn.Words` (плоские неймспейсы; стор внутри пакета, брифы
 * learn-library-block-migration.md / apps-learn-mount-library-blocks.md). Инфо
 * выбранного (`Learn.Library.Info`) — в rightBar.
 */
const Explorer = Page((Ui) => (
  <Layouts.Matrix
    preset="app-shell"
    slots={{
      main: {
        children: (
          <Ui.Layout.Flex orientation="vertical" h="full">
            <Learn.Search />
            <Learn.Words />
          </Ui.Layout.Flex>
        ),
      },
      rightBar: {
        children: <Learn.Library.Info />,
      },
    }}
  />
));

export default Explorer;
