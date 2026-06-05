/**
 * MatrixController — прозрачная emit-проводка для raw Matrix (ADR 032).
 *
 * Tier 2 connected block: обычный компонент (НЕ Controller-обёртка),
 * который рендерится ВНУТРИ родительского HCA-контекста и транслирует
 * `onLayoutChange` через `useEmit` в HCA event-pipeline.
 *
 * Принципиальное отличие от предыдущей реализации:
 * - НЕ создаёт собственный Controller-scope, store, Context.Provider.
 * - Слот-контент Matrix рендерится внутри РОДИТЕЛЬСКОГО контекста (нет затенения).
 * - `useEmit()` нацелен на ближайший существующий Controller/Feature аппа.
 *
 * Архитектурный поток:
 *   Features.Incidents → <Shell.Matrix slots={{ main: <Widgets.Tables.Incidents/> }} />
 *     Matrix.onLayoutChange(e) → useEmit → emit('onLayoutChange', { source, payload: e })
 *       → ctx.controller.onLayoutChange → Features.Incidents (или auto-next() наверх)
 *
 * Слот-контент (напр. Widgets.Tables.Incidents) читает store Features.Incidents ✓
 *
 * Standalone guard:
 *   Если Shell.Matrix рендерится вне любого Controller/Feature, useEmit() бросит.
 *   Защита через useCtx(): если контекста нет — emit не вызывается, Matrix работает
 *   как pure-UI (layout-only без HCA-проводки).
 *
 * Phantom-поле `__events?: IMatrixEvents` позволяет:
 *   `Feature<EventsOf<typeof Shell.Matrix>>` → `target.payload` типизируется как
 *   `LayoutChangeEvent | undefined` без per-handler аннотации.
 *
 * Пример app-DX:
 * ```ts
 * const LayoutSync = Feature<Shell.Matrix.Events>((services) => ({
 *   context: { saving: false },
 *   onLayoutChange: ({ target }) => {
 *     services.api.saveLayout(target.payload);  // payload: LayoutChangeEvent | undefined
 *   },
 * }));
 * // <Features.LayoutSync>
 * //   <Shell.Matrix preset="app-shell" slots={{ main: <Widgets.Tables.Incidents/> }} />
 * // </Features.LayoutSync>
 * ```
 */

import { useCtx, useEmit } from '@capsuletech/web-core';
import { splitProps } from 'solid-js';
import type { IMatrixEvents, IMatrixProps, LayoutChangeEvent } from '../matrix/interfaces';
import { Matrix } from '../matrix/matrix';

// Re-export types для потребителей /controllers
export type { IMatrixEvents, LayoutChangeEvent } from '../matrix/interfaces';

// ---------------------------------------------------------------------------
// MatrixControllerComponent — прозрачная проводка, без собственного Context.
//
// useCtx() безопасно возвращает undefined вне Controller/Feature-scope.
// useEmit() вызывается только когда ctx есть — без бросания в standalone.
// ---------------------------------------------------------------------------

const MatrixControllerComponent = (props: IMatrixProps) => {
  // useCtx() не бросает — просто undefined если нет Context.
  const ctx = useCtx();
  // useEmit() вызываем только если контекст есть, иначе standalone-Matrix
  // работает как pure layout (без emit).
  // В Solid условный вызов хука в render-scope допустим.
  // biome-ignore lint/correctness/useHookAtTopLevel: guard — intentional, ctx определён через useContext
  const emit = ctx ? useEmit() : undefined;

  const [local, rest] = splitProps(props, ['onLayoutChange']);

  const handleLayoutChange = (e: IMatrixEvents['onLayoutChange']) => {
    // Escape-hatch: app-callback если передан напрямую.
    local.onLayoutChange?.(e);
    // HCA emit — только если внутри Controller/Feature-scope.
    emit?.('onLayoutChange', {
      source: 'Shell.Matrix',
      payload: e,
    });
  };

  return <Matrix {...rest} onLayoutChange={handleLayoutChange} />;
};

/**
 * Shell.Matrix — прозрачная emit-проводка поверх raw Matrix.
 *
 * НЕ создаёт Controller-scope: слот-контент видит родительский HCA-контекст.
 * Несёт phantom `__events?: IMatrixEvents` для `EventsOf<typeof Shell.Matrix>`.
 * Регистрируется в manifest (src/capsule.ts) вместо raw Matrix.
 */
export const MatrixController: ((props: IMatrixProps) => any) & {
  readonly __events?: IMatrixEvents;
} = MatrixControllerComponent;

// Namespace-merge `Shell.Matrix.Events` живёт в ./shell-events.d.ts (ambient).
