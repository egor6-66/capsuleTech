/**
 * Canvas (host) — встраивает universal-canvas как self-contained iframe-src app (ADR 059).
 * Host грузит реальный URL приложения по `<Remote.View>`; апп монтирует себя сам.
 *
 * ADR 060: ремоут зарегистрирован в `capsule.app.ts → remotes` (D5, Provider читает реестр);
 * `onMounted` типизирован из vendored-контракта (`out.mounted` → `{ name, ts }`), без импортов (D6).
 */
const Canvas = Widget((Ui) => (
  <Features.Canvas>
    <Ui.Layout.Flex direction={'col'} h={'full'} w={'full'}>
      <Ui.Button meta={{ tags: ['ping'] }}>Ping remote</Ui.Button>
      <Remote.View name="universal-canvas" instanceId="main" />
    </Ui.Layout.Flex>
  </Features.Canvas>
));

export default Canvas;
