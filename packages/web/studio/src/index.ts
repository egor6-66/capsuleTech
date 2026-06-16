// Корневой barrel — реэкспортит публичные подпуть. Для tree-shaking
// предпочтительно импортировать через subpath:
//   import { ComponentsPalette }    from '@capsuletech/web-studio/palette';
//   import { WebStudioCanvas, ... } from '@capsuletech/web-studio/controllers';
//   import { getManifest }          from '@capsuletech/web-studio/manifests';
//   import { DocSection }           from '@capsuletech/web-studio/docs';

export * from './controllers';
export * from './manifests';
export * from './palette';
export { type IWebStudioSelection, useSelectedPreset } from './selection';
