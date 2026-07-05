# @capsuletech/web-studio

Host/composer для дизайна UI capsule — manifests + state-ops + inspector + procedural generators + DnD resolvers.  ·  zone: **studio**  ·  status: **alpha (0.1.1)**

> Single inhabitant of `studio` zone (5-я zone, host/composer per ADR 047 D6). Composition rule: studio exports product-blocks, raw engines живут в своих пакетах. Текущий внутренний layout — quick-and-dirty, audit см. [OWNERSHIP.md](./OWNERSHIP.md).

## Install

```bash
pnpm add @capsuletech/web-studio
# peer deps:
pnpm add solid-js @capsuletech/web-renderer
```

## Minimum usage

```ts
// Subpath-импорты для tree-shake'а:
import { getManifest, canAcceptChild } from '@capsuletech/web-studio/manifests';
import { addNode, moveNode }           from '@capsuletech/web-studio/state';
import { Inspector }                   from '@capsuletech/web-studio/inspector';
import { generate, FORM_PRESET }       from '@capsuletech/web-studio/generators';

// Procedural — seeded:
const tree = generate({ preset: FORM_PRESET, seed: 42 });
```

Runtime-рендер по JSON-схеме — в отдельном пакете [`@capsuletech/web-renderer`](../runtime/renderer/) (production-safe, без manifest/zod deps).

## Subpath exports

- `/manifests` — реестр спецификаций компонентов, `getManifest`, `canAcceptChild`.
- `/state` — pure-функции на JSON-дереве: `addNode`, `moveNode`, immutable.
- `/inspector` — generic UI-form по manifest (studio-only).
- `/generators` — procedural/seeded генераторы UI-деревьев + presets.
- `/controllers` — `WebStudioController` + `WebStudioOverlay` (единственный subpath с зависимостью на `web-core`).
- `/capsule` — capsule manifest (ADR 032 phase 5).

## Build

```bash
pnpm nx build @capsuletech/web-studio
```

Multi-entry: `index` + `manifests` + `state` + `inspector` + `generators` + `controllers` + `capsule`.

## Docs

- AI-anchor: [`docs/_meta/studio.md`](../../../../docs/_meta/studio.md)
- Zone canon: [`docs/_meta/web-zones/workspace.md`](../../../../docs/_meta/web-zones/workspace.md)
- OWNERSHIP: [`./OWNERSHIP.md`](./OWNERSHIP.md)
- ADR 032 phase 5 (package /controllers + useEmit), ADR 045 #2, ADR 047 D4 + D6 (zone flatten).
