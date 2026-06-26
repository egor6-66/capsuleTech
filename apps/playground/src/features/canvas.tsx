/**
 * Canvas (host) — host-логика канваса студии. Клик кнопки → dispatch данных в
 * ремоут (host→app, ADR 060 D1). `useRemote` — санкционированный глобал (HOOK_IMPORTS),
 * без ручного импорта рантайма.
 *
 * instanceId 'main' совпадает с `<Remote.View instanceId="main">` → IframeTransport
 * роутит dispatch в нужный iframe (toInstance → ключ `name:instanceId`).
 */
const Canvas = Feature(({ utils }) => {
  const { remote } = useRemote();
  const canvas = remote('universal-canvas', 'main');

  return {
    initial: 'idle',
    states: {
      idle: {
        onClick: ({ target }) => {
          if (utils.includes(target.meta?.tags ?? [], 'ping')) {
            // eslint-disable-next-line no-console
            console.log('[host:canvas] dispatch setData → remote');
            canvas.dispatch('ping', { value: 'hello from host', ts: Date.now() });
          }
        },
      },
    },
  };
});

export default Canvas;
