/**
 * Canvas — корневой контроллер канваса (топовый логик-враппер, parent === undefined →
 * на него регистрируется host→app inbound + app→host forward-gate, ADR 060 D1).
 *
 * Проверка паттерна «одно действие — два источника» + флага run-режима (`standalone`
 * из services, web-core embedded flag):
 *  - `ping` — ЕДИНСТВЕННАЯ логика. Дёргается двумя путями, тело одно:
 *      • host→app: хост шлёт `dispatch('ping', {value, ts})` (contract.in) со своими данными;
 *      • локально: своя кнопка → `onClick` → `emit('ping', …)` со своими данными.
 *    `ping` логирует `standalone` и пишет режим в текст — так видно, кто драйвит и где запущен.
 *  - standalone (канвас сам, :3000): клик → `standalone=true`.
 *  - embedded (в хосте): клик → `ping` отрабатывает локально (`ping ∈ in`, не `out` →
 *    forward-gate не перехватывает) → `standalone=false`; хост-кнопка тоже бьёт в `ping`.
 *
 * `standalone` берётся из services (аргумент фабрики), НЕ из API хендлера.
 */
const Canvas = Controller(({ utils, standalone }) => ({
  initial: 'idle',

  context: {
    text: null as string | null,
    // схема для рендерера: null → Display показывает demoSchema-fallback.
    schema: null as unknown,
  },

  states: {
    idle: {
      // host→app + локально: ЕДИНСТВЕННОЕ тело, payload одинаков от обоих источников.
      ping: ({ target, store }) => {
        const p = target.payload as { value: string; ts: number };
        // eslint-disable-next-line no-console
        console.log(`[canvas:ping] standalone=${standalone} ← ${p.value} @ ${p.ts}`);
        store.update({ text: `${p.value} @ ${p.ts} (standalone=${standalone})` });
      },

      // host→app (contract.in.setComposition): хост прислал JSON-схему → кладём в
      // контекст, Display кормит ею Renderer.View. Источник у хоста — палитра
      // студии (onPresetSelect), но канвас этого не знает: просто «вот схема, рисуй».
      setComposition: ({ target, store }) => {
        const p = target.payload as { schema: unknown };
        // eslint-disable-next-line no-console
        console.log('[canvas:setComposition] ← schema received');
        store.update({ schema: p.schema });
      },

      // своя кнопка → один клик бьёт в оба имени:
      //  - ping (∈ in)  → локально (flag-демо: standalone?);
      //  - canvasClick (∈ out) → standalone локально / embedded форвард хосту.
      onClick: ({ target, emit }) => {
        if (utils.includes(target.meta?.tags ?? [], 'canvas-btn')) {
          const ts = Date.now();
          emit('ping', { payload: { value: 'local click', ts } });
          emit('canvasClick', { payload: { value: 'from canvas', ts } });
        }
      },
    },
  },
}));

export default Canvas;
