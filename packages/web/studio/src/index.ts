// Корневой barrel — реэкспортит публичные подпуть. Для tree-shaking
// предпочтительно импортировать через subpath:
//   import { ComponentsPalette } from '@capsuletech/web-studio/palette';
//   import { getManifest }       from '@capsuletech/web-studio/manifests';
//
// Connected-панели (Tree / Props / Info / Welcome / Provider) подключаются как
// глобалы `WebStudio.*` через `@capsuletech/web-studio/capsule` (ADR 033), а не
// импортятся напрямую.
//
// Docs runtime lives in @capsuletech/web-docs (extracted per ADR 052 Phase 3.6):
//   import { DocSection, DocsProvider } from '@capsuletech/web-docs';

export * from './manifests';
export * from './palette';
export { type IWebStudioSelection, useSelectedPreset } from './selection';
