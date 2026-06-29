/**
 * Canvas (host) — встраивает universal-canvas как self-contained iframe-src app (ADR 059).
 * Host грузит реальный URL приложения по `<Remote.View>`; апп монтирует себя сам.
 *
 * ADR 060: ремоут зарегистрирован в `capsule.app.ts → remotes` (D5, Provider читает реестр);
 * `onMounted` типизирован из vendored-контракта (`out.mounted` → `{ name, ts }`), без импортов (D6).
 */
// Features.Canvas обёртка переехала на уровень студийной страницы (web-studio/index.tsx),
// чтобы обнимать и палитру, и канвас (сток баблинга onPresetSelect). Здесь — только embed.
const Canvas = Widget((Ui) => (
  <Ui.Layout.Flex h={'full'} w={'full'}>
    <Remote.View name="universal-canvas" instanceId="main" />
  </Ui.Layout.Flex>
));

export default Canvas;
