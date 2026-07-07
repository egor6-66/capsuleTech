// Корневой barrel — реэкспортит публичные подпуть. Для tree-shaking
// предпочтительно импортировать через subpath:
//   import { ComponentsPalette } from '@capsuletech/web-studio/palette';
//   import { getManifest }       from '@capsuletech/web-studio/manifests';
//
// Connected-панели (Tree / Props / Info / Welcome / Provider) подключаются как
// глобалы `WebStudio.*` через `@capsuletech/web-studio/capsule` (ADR 033), а не
// импортятся напрямую.
//
// Единый document-store (`useDocument`) — SSOT редактируемого дерева; заменил
// раздельные selection.ts + composition.ts (бриф studio-creator-tree-iter1 §1).
//
// Docs runtime lives in @capsuletech/web-docs (extracted per ADR 052 Phase 3.6):
//   import { DocSection, DocsProvider } from '@capsuletech/web-docs';

export { COMPOSITION_ROOT_ID, type IWebStudioDocument, useDocument } from './core';
export * from './shared/manifests';
export * from './modules/palette';
