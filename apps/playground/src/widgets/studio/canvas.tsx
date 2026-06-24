/**
 * Canvas (host) — встраивает universal-canvas как self-contained iframe-src app (ADR 059).
 * Host грузит реальный URL приложения по `<Remote.View>`; апп монтирует себя сам
 * (свой solid/router), канал host↔app — только postMessage. Никакого embedding-кода.
 */
const Canvas = Widget((Ui) => (
  <Ui.Layout.Flex h={'full'} w={'full'}>
    <Remote.View name="universal-canvas" />
  </Ui.Layout.Flex>
));

export default Canvas;
