/**
 * Studio.Header — хедер web-studio layout'а. Содержит только навигацию между
 * разделами (`WebStudio.Navigation` из пакета студии, ADR 032).
 *
 * Все знания о сегментах (список + активный) живут внутри пакета: студия знает
 * свои разделы, активный сегмент derived из текущего pathname. App только ловит
 * событие `onNavigate` в Features.App и делает `router.goTo`.
 */
const Header = Widget((Ui) => (
  <Ui.Layout.Flex justify="center" align="center" h="full">
    <WebStudio.Navigation />
  </Ui.Layout.Flex>
));

export default Header;
