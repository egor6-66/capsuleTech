/**
 * Widgets.Navigation — контейнер под-навигации раздела. Принимает навигацию пакета
 * чилдом, единый chrome для любого section-nav:
 *   <Widgets.Navigation><Learn.LibraryNav /></Widgets.Navigation>
 */
const Navigation = Widget((Ui, props: { children?: unknown }) => (
  <Ui.Layout.Flex justify="center" align="center" h="full">
    {props?.children}
  </Ui.Layout.Flex>
));

export default Navigation;
