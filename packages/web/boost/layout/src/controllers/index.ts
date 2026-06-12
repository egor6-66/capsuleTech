/**
 * @capsuletech/boost-layout/controllers — HCA integration layer (ADR 032).
 *
 * Этот subpath единственный в boost-layout, который может зависеть от
 * `@capsuletech/web-core`. Содержит Controller-обёртки package-level блоков,
 * транслирующие нативные callback'ы в HCA event-pipeline через `useEmit`.
 *
 * Текущие блоки:
 *  - MatrixController — Controller-обёртка `Layouts.Matrix` (ADR 032):
 *    `onLayoutChange` → emit → auto-next() → родительская Feature аппа.
 *
 * Пример подключения:
 * ```ts
 * const Shell = Feature<Layouts.Matrix.Events>((services) => ({
 *   context: { saving: false },
 *   onLayoutChange: ({ target }) => {
 *     services.api.saveLayout(target.payload);
 *   },
 * }));
 * ```
 */

export type { IMatrixEvents } from '../matrix/interfaces';
export { MatrixController } from './matrixController';
