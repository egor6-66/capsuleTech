/**
 * @capsuletech/web-shell/controllers — HCA integration layer (ADR 032).
 *
 * Единственный subpath, который может зависеть от `@capsuletech/web-core`.
 * Содержит Controller-обёртки package-level блоков, транслирующие
 * нативные callback'ы в HCA event-pipeline через `useEmit`.
 *
 * Текущие блоки:
 *  - MatrixController — Controller-обёртка Shell.Matrix (ADR 032):
 *    `onLayoutChange` → emit → auto-next() → родительская Feature аппа.
 *
 * Пример подключения:
 * ```ts
 * const LayoutSync = Feature<Shell.Matrix.Events>((services) => ({
 *   context: { saving: false },
 *   onLayoutChange: ({ target }) => {
 *     services.api.saveLayout(target.payload);
 *   },
 * }));
 * ```
 */

export { MatrixController } from './matrixController';
export type { IMatrixEvents } from '../matrix/interfaces';
