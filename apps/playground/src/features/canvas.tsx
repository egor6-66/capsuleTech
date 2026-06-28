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
        // host→remote: своя кнопка Ping → шлём данные в канвас (contract.in).
        onClick: ({ target }) => {
          if (utils.includes(target.meta?.tags ?? [], 'ping')) {
            // eslint-disable-next-line no-console
            console.log('[host:canvas] dispatch ping → remote');
            canvas.dispatch('ping', { value: 'hello from host', ts: Date.now() });
          }
        },

        // remote→host: канвас форварднул out-событие (contract.out) → ловим ЗДЕСЬ, в хост-Feature.
        // Доезжает после правки web-remote (auto-route forwarded → nearest enclosing logic, ADR 061).
        canvasClick: ({ target }) => {
          const p = target.payload as { value: string; ts: number };
          // eslint-disable-next-line no-console
          console.log('[host:canvas] ← remote canvasClick:', p);
        },
      },
    },
  };
});

export default Canvas;
