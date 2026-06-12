// Корневой barrel — реэкспортит все подпакеты. Для tree-shaking
// предпочтительно импортировать через подпуть:
//   import { getManifest }   from '@capsuletech/studio/manifests';
//   import { addNode }       from '@capsuletech/studio/state';
//   import { Inspector }     from '@capsuletech/studio/inspector';
//   import { buildTemplate } from '@capsuletech/studio/generators';
// Тут — точка для тех, кому удобнее «всё в одном импорте».
//
// NOTE: data-gen engine (generate, presets, RNG) теперь живёт отдельным
// пакетом `@capsuletech/data-gen`. Studio's `/generators` остаётся для
// palette templates (composition of presets с studio UI-метаданными).

export * from './generators';
export * from './inspector';
export * from './manifests';
export * from './state';
