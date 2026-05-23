# @capsuletech/web-ui-creator

Design-time зона создания UI: и ручное (через визуальный редактор), и автоматическое (procedural generators). Содержит реестр спецификаций компонентов (manifests), операции над JSON-деревом (state) и generic-инспектор пропсов (inspector). Все три раньше жили как отдельные пакеты (`@capsuletech/web-manifests`/`-editor-state`/`-inspector`) — слиты в один с подпутями. Ранее назывался `@capsuletech/web-editor` (переименован в 0.2.0 — пакет теперь покрывает не только editor-flow, но и auto-generation).

```ts
// Можно одним импортом, но для tree-shaking предпочтительно через subpath:
import { getManifest, canAcceptChild } from '@capsuletech/web-ui-creator/manifests';
import { addNode, moveNode }           from '@capsuletech/web-ui-creator/state';
import { Inspector }                   from '@capsuletech/web-ui-creator/inspector';
import { generate, FORM_PRESET }       from '@capsuletech/web-ui-creator/generators';
```

Runtime-рендер по JSON-схеме — в отдельном пакете [`@capsuletech/web-renderer`](../renderer): он без deps на zod/manifests и подходит для прода.

Сборка: `pnpm nx build @capsuletech/web-ui-creator` (multi-entry: `index` + `manifests` + `state` + `inspector` + `generators`).
