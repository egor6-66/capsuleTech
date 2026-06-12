# @capsuletech/studio

Design-time toolkit для построения JSON-деревьев UI: manifests + state-ops + inspector + procedural generators + DnD resolvers.  ·  zone: **design-time**  ·  status: **alpha (0.1.1)**

> Будет absorbed в `@capsuletech/studio` (→ `@capsuletech/studio`) в Phase D4 [[web-rework-plan]] (ADR 045 #2 + ADR 047 D4). Используется sandbox + playground; рекомендую миграцию после studio publish.

## Install

```bash
pnpm add @capsuletech/studio
# peer deps:
pnpm add solid-js @capsuletech/web-renderer
```

## Minimum usage

```ts
// Subpath-импорты для tree-shake'а:
import { getManifest, canAcceptChild } from '@capsuletech/studio/manifests';
import { addNode, moveNode }           from '@capsuletech/studio/state';
import { Inspector }                   from '@capsuletech/studio/inspector';
import { generate, FORM_PRESET }       from '@capsuletech/studio/generators';

// Procedural — seeded:
const tree = generate({ preset: FORM_PRESET, seed: 42 });
```

Runtime-рендер по JSON-схеме — в отдельном пакете [`@capsuletech/web-renderer`](../renderer/) (production-safe, без manifest/zod deps).

## Subpath exports

- `/manifests` — реестр спецификаций компонентов, `getManifest`, `canAcceptChild`.
- `/state` — pure-функции на JSON-дереве: `addNode`, `moveNode`, immutable.
- `/inspector` — generic UI-form по manifest, design-time only.
- `/generators` — procedural/seeded генераторы UI-деревьев + presets.
- `/controllers` — `EditorController` + `EditorOverlay` (единственный subpath с зависимостью на `web-core`).
- `/capsule` — capsule manifest (ADR 032 phase 5).

## Build

```bash
pnpm nx build @capsuletech/studio
```

Multi-entry: `index` + `manifests` + `state` + `inspector` + `generators` + `controllers` + `capsule`.

## Docs

- AI-anchor: [`docs/_meta/studio.md`](../../../docs/_meta/studio.md)
- Zone canon: [`docs/_meta/web-zones/design-time.md`](../../../docs/_meta/web-zones/design-time.md)
- OWNERSHIP: [`./OWNERSHIP.md`](./OWNERSHIP.md)
- ADR 032 phase 5 (package /controllers + useEmit), ADR 045 #2 + ADR 047 D4 (absorb in studio).
