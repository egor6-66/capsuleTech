/**
 * Canvas (host) — встраивает universal-canvas как self-contained iframe-src app (ADR 059).
 * Host грузит реальный URL приложения по `<Remote.View>`; апп монтирует себя сам.
 *
 * ADR 060: ремоут зарегистрирован в `capsule.app.ts → remotes` (D5, Provider читает реестр);
 * `onMounted` типизирован из vendored-контракта (`out.mounted` → `{ name, ts }`), без импортов (D6).
 */
const Canvas = Widget((Ui) => (
  <Ui.Layout.Flex h={'full'} w={'full'}>
    <Remote.View name="universal-canvas" onMounted={(p) => console.log('[canvas mounted]', p.name, p.ts)} />
  </Ui.Layout.Flex>
));

export default Canvas;
