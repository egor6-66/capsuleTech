/**
 * CanvasBinding — внутренняя логик-связка студии «selection-store → канвас».
 *
 * Феча-обёртка (HCA logic-wrapper) монтируется в `WebStudio.Provider` ВЫШЕ и
 * палитры, и канваса (оба — её `children`), поэтому она:
 *   - живёт внутри одного скоупа с `selection.ts` (SSOT студии);
 *   - держит remote-handle (рендерится внутри `<Remote.Provider>`).
 *
 * SSOT — `selection.ts`. И палитра (`setSelected`), и инспектор (`patchProps`)
 * пишут туда. Канвас должен лишь РЕАКТИВНО отражать `selection.schema()` —
 * поэтому здесь `createEffect`, а не one-shot dispatch на событие. Так правки
 * инспектора (granular patchProps) доходят до канваса, а не теряются.
 *
 * out-события канваса (`canvasClick` и будущие) долетают СЮДА как nearest
 * enclosing logic (ADR 061) — обрабатываются внутри студии. Наверх (в апп)
 * студия эмитит только осознанные именованные события (в этой итерации — никакие).
 *
 * Имя remote-модуля берётся из `CanvasNameContext` (Provider — single source).
 */

import { Feature } from '@capsuletech/web-core';
import { useRemote } from '@capsuletech/web-remote';
import { createEffect } from 'solid-js';
import { useSelectedPreset } from '../selection';
import { useCanvasName } from './canvasContext';

const CanvasBinding = Feature(() => {
  const canvasName = useCanvasName();
  const { remote } = useRemote();
  // instanceId 'main' совпадает с `<Remote.View instanceId="main">` в WebStudio.Canvas.
  const canvas = remote(canvasName, 'main');
  const { schema: selectedSchema } = useSelectedPreset(); // SSOT студии

  // Канвас реактивно зеркалит editable-схему selection-стора.
  // JSON-снимок: (1) глубокое чтение → эффект трекает ЛЮБУЮ вложенную правду
  //   props (granular patchProps инспектора файрит эффект);
  // (2) сериализуемый plain-снимок для postMessage-границы remote
  //   (store-proxy туда отдавать нельзя).
  createEffect(() => {
    const s = selectedSchema();
    if (!s) return; // ничего не выбрано — канвас держит пустую схему (renderer-дефолт)
    canvas.dispatch('setComposition', { schema: JSON.parse(JSON.stringify(s)) });
  });

  return {
    initial: 'idle',
    states: {
      idle: {
        // канвас → студия: out-событие (contract.out) ловим здесь (nearest logic).
        // Внутренняя обработка — пока no-op (composition-сборка = отдельная итерация).
        canvasClick: () => {},
      },
    },
  };
});

export default CanvasBinding;
