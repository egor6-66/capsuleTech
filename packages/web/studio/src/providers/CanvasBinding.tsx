/**
 * CanvasBinding — внутренняя логик-связка студии «палитра → канвас».
 *
 * Феча-обёртка (HCA logic-wrapper) монтируется в `WebStudio.Provider` ВЫШЕ и
 * палитры, и канваса (оба — её `children`), поэтому она:
 *   - сток баблинга `onPresetSelect` (эмитит `WebStudio.ComponentsPalette`);
 *   - держит remote-handle (рендерится внутри `<Remote.Provider>`).
 *
 * На `onPresetSelect` → `dispatch('setComposition', { schema })` в remote-канвас
 * (contract.in канваса). Канвас не знает про палитру — получает «вот схема, рисуй».
 *
 * out-события канваса (`canvasClick` и будущие) долетают СЮДА как nearest
 * enclosing logic (ADR 061) — обрабатываются внутри студии. Наверх (в апп)
 * студия эмитит только осознанные именованные события (в этой итерации — никакие).
 *
 * Имя remote-модуля берётся из `CanvasNameContext` (Provider — single source).
 */

import type { ISchema } from '@capsuletech/web-contract';
import { Feature } from '@capsuletech/web-core';
import { useRemote } from '@capsuletech/web-remote';
import { useCanvasName } from './canvasContext';

const CanvasBinding = Feature(() => {
  const canvasName = useCanvasName();
  const { remote } = useRemote();
  // instanceId 'main' совпадает с `<Remote.View instanceId="main">` в WebStudio.Canvas.
  const canvas = remote(canvasName, 'main');

  return {
    initial: 'idle',
    states: {
      idle: {
        // палитра → канвас: переправляем схему пресета как host→app setComposition.
        onPresetSelect: ({ target }) => {
          const { schema } = target.payload as { schema: ISchema };
          canvas.dispatch('setComposition', { schema });
        },

        // канвас → студия: out-событие (contract.out) ловим здесь (nearest logic).
        // Внутренняя обработка — пока no-op (composition-сборка = отдельная итерация).
        canvasClick: () => {},
      },
    },
  };
});

export default CanvasBinding;
