// Корневой barrel — реэкспортит публичные подпуть. Для tree-shaking
// предпочтительно импортировать через subpath:
//   import { ComponentsPalette }    from '@capsuletech/web-studio/palette';
//   import { WebStudioCanvas, ... } from '@capsuletech/web-studio/controllers';
//   import { getManifest }          from '@capsuletech/web-studio/manifests';
//
// Docs runtime lives in @capsuletech/web-docs (extracted per ADR 052 Phase 3.6):
//   import { DocSection, DocsProvider } from '@capsuletech/web-docs';

export * from './controllers';
export * from './manifests';
export * from './palette';
export { type IWebStudioSelection, useSelectedPreset } from './selection';
