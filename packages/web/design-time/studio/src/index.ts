// Корневой barrel — реэкспортит все подпакеты. Для tree-shaking
// предпочтительно импортировать через подпуть:
//   import { getManifest } from '@capsuletech/studio/manifests';
//   import { addNode }    from '@capsuletech/studio/state';
//   import { Inspector }  from '@capsuletech/studio/inspector';
//   import { generate }   from '@capsuletech/studio/generators';
// Тут — точка для тех, кому удобнее «всё в одном импорте».

export * from './generators';
export * from './inspector';
export * from './manifests';
export * from './state';
