/**
 * @capsuletech/web-shell/controllers — HCA integration layer (ADR 032).
 *
 * Единственный subpath, который может зависеть от `@capsuletech/web-core`.
 * Содержит Controller-обёртки package-level chrome-блоков, транслирующие
 * нативные callback'ы в HCA event-pipeline через `useEmit`.
 *
 * Matrix Controller переехал в `@capsuletech/boost-layout/controllers` per
 * ADR 046 (amended 2026-06-12) — see `MatrixController` and `IMatrixEvents`
 * exports there. Apps now register `@capsuletech/boost-layout` and use
 * `Feature<Layouts.Matrix.Events>(...)`.
 */

export {};
