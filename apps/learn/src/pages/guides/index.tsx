/**
 * /guides — in-app tour'ы (скелет).
 *
 * `Learn.Tour` — guide-движок (второй plugin-модуль learn-бэка, ADR 055 D8).
 * Сейчас плейсхолдер.
 */
const Guides = Page((Ui) => (
  <Ui.Layout.Flex class="min-h-screen flex-col gap-6 p-8">
    <Ui.Typography variant="h1">Guides</Ui.Typography>
    <Learn.Tour guideId="intro" />
  </Ui.Layout.Flex>
));

export default Guides;
