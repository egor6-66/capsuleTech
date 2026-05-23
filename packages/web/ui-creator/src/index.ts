// Корневой barrel — реэкспортит все подпакеты. Для tree-shaking
// предпочтительно импортировать через подпуть:
//   import { getManifest } from '@capsuletech/web-ui-creator/manifests';
//   import { addNode }    from '@capsuletech/web-ui-creator/state';
//   import { Inspector }  from '@capsuletech/web-ui-creator/inspector';
//   import { generate }   from '@capsuletech/web-ui-creator/generators';
// Тут — точка для тех, кому удобнее «всё в одном импорте».

export * from './generators';
export * from './inspector';
export * from './manifests';
export * from './state';
