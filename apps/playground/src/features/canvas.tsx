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

        // палитра студио (WebStudio.ComponentsPalette) эмитнула onPresetSelect (useEmit,
        // баббл к этому Feature) → переправляем схему в канвас как host→app setComposition.
        // Канвас не знает про палитру — получает «вот схема, рисуй». Это точка внешних
        // сайд-эффектов аппа на студийное событие.
        onPresetSelect: ({ target }) => {
          // payload.schema — ISchema от палитры; форма совместима с contract.in.setComposition.
          const p = target.payload as {
            schema: { components: { root: string; nodes: Record<string, never> } };
          };
          // eslint-disable-next-line no-console
          console.log('[host:canvas] ← palette onPresetSelect → dispatch setComposition');
          canvas.dispatch('setComposition', { schema: p.schema });
        },
      },
    },
  };
});

export default Canvas;
