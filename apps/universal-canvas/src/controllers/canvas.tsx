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
  },

  states: {
    idle: {
      // ЕДИНСТВЕННОЕ тело. payload приходит и от хоста, и от локального emit — без разницы.
      ping: ({ target, store }) => {
        const p = target.payload as { value: string; ts: number };
        // eslint-disable-next-line no-console
        console.log(`[canvas:ping] standalone=${standalone} ← ${p.value} @ ${p.ts}`);
        store.update({ text: `${p.value} @ ${p.ts} (standalone=${standalone})` });
      },

      // своя кнопка → переиспускаем то же именованное действие со своими данными.
      onClick: ({ target, emit }) => {
        if (utils.includes(target.meta?.tags ?? [], 'canvas-btn')) {
          emit('ping', { payload: { value: 'local click', ts: Date.now() } });
        }
      },
    },
  },
}));

export default Canvas;
