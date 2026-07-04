/**
 * /library/explorer — сетка слов (поиск + плитка) из пакетных блоков
 * `Learn.Library.*` (стор внутри пакета, брифы learn-library-block-migration.md /
 * apps-learn-mount-library-blocks.md). Инфо выбранного — в rightBar.
 */
const Explorer = Page((Ui) => (
  <Layouts.Matrix
    preset="app-shell"
    slots={{
      main: {
        children: (
          <Ui.Layout.Flex orientation="vertical" h="full">
            <Learn.Library.Search />
            <Learn.Library.Words />
          </Ui.Layout.Flex>
        ),
        resizable: true,
        bordered: false,
      },
      rightBar: {
        children: <Learn.Library.Info />,
        resizable: true,
        bordered: false,
      },
    }}
  />
));

export default Explorer;
