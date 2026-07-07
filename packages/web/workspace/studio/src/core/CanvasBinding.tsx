/**
 * CanvasBinding — внутренняя логик-связка студии «document-store → канвас».
 *
 * Феча-обёртка (HCA logic-wrapper) монтируется в `WebStudio.Provider` ВЫШЕ и
 * палитры, и канваса (оба — её `children`), поэтому она:
 *   - живёт внутри одного скоупа с `document.ts` (SSOT студии);
 *   - держит remote-handle (рендерится внутри `<Remote.Provider>`).
 *
 * SSOT — `document.ts` (единый стор). И палитра (`loadPreset`), и мини-палитра
 * узла (`insertPreset`), и инспектор (`patchProps`) пишут туда. Канвас должен
 * лишь РЕАКТИВНО отражать `document.schema()` — поэтому здесь `createEffect`, а
 * не one-shot dispatch на событие. Так правки инспектора (granular patchProps)
 * и инкрементальная сборка (insertPreset) доходят до канваса, а не теряются.
 * Один эффект, без ветвления по mode — канвас mode-agnostic (бриф §4).
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
import { useCanvasName } from './canvasContext';
import { useDocument } from './document';
import { useStudioMode } from './useStudioMode';

const CanvasBinding = Feature(() => {
  const canvasName = useCanvasName();
  const { remote } = useRemote();
  // instanceId 'main' совпадает с `<Remote.View instanceId="main">` в WebStudio.Canvas.
  const canvas = remote(canvasName, 'main');
  // Активный режим (URL): в store-странице канвас рисует активный пресет,
  // в creator-странице — собираемую композицию. Слайсы независимы.
  const { schema } = useDocument(useStudioMode()); // SSOT студии

  // Канвас реактивно зеркалит весь editable document (не одиночный пресет).
  // JSON-снимок: (1) глубокое чтение → эффект трекает ЛЮБУЮ вложенную правду
  //   props (granular patchProps инспектора + insertPreset файрят эффект);
  // (2) сериализуемый plain-снимок для postMessage-границы remote
  //   (store-proxy туда отдавать нельзя).
  // Пустой document (только root Flex) → канвас рисует пустой контейнер
  // (renderer-дефолт) — валидно, без null-guard (document всегда есть).
  createEffect(() => {
    canvas.dispatch('setComposition', { schema: JSON.parse(JSON.stringify(schema())) });
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
