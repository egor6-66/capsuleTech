# @capsuletech/data-gen

Pure procedural UI-tree generator: seedable RNG + zod-aware fuzzer + declarative presets. Engine extract'нут из `@capsuletech/studio` (S1, 2026-06-13). · zone: **runtime** · status: **alpha (0.0.0)**

> Используется studio для палитры палитры/превью, apps для landing demos и mock data, test-стендами для воспроизводимых UI-сценариев. Pure logic — никаких UI / DOM / framework-вендоров.

## Install

```bash
pnpm add @capsuletech/data-gen
# peer:
pnpm add solid-js
```

## Minimum usage

```ts
import { FORM_PRESET, generate } from '@capsuletech/data-gen';

// Deterministic — same seed → same tree
const tree = generate(FORM_PRESET, { seed: 42 });

// tree.root → NodeId of root
// tree.nodes → Record<NodeId, IEditorNode>
//   IEditorNode = { id, type, parentId, children, props, meta, styles }
//   Compatible with @capsuletech/web-renderer's ISchema.components.nodes
```

Inject a manifest resolver to fuzz props from zod schemas:

```ts
import { generate, type IManifestResolver } from '@capsuletech/data-gen';
import { getManifest } from '@capsuletech/studio/manifests';

const resolveManifest: IManifestResolver = (type) => getManifest(type);

const tree = generate(FORM_PRESET, {
  seed: 1,
  resolveManifest,
});
```

Without `resolveManifest`, nodes have empty props (structure-only generation).

## Public API

- `generate(preset, options?)` — build tree from preset
- `createRng(seed)`, `coin`, `pick`, `pickWeighted`, `randomInt`, `seededId`, type `Rng` — RNG primitives
- `fuzzProps(rng, schema, defaults)` — standalone fuzzer
- Presets: `FORM_PRESET`, `CARD_PRODUCT_PRESET`, `LAYOUT_2COL_PRESET`, `BUTTON_PRIMARY_PRESET`, `BUTTON_OUTLINE_PRESET`, `TYPOGRAPHY_H1_PRESET`, `TYPOGRAPHY_PARAGRAPH_PRESET`
- Wordbank: `FIELD_LABELS`, `CARD_TITLES`, `BUTTON_PRIMARY_TEXTS`, etc. + `labelToInputType`, `labelToPlaceholder`
- Types: `IEditorTree`, `IEditorNode`, `NodeId`, `IPreset`, `ISlotPick`, `ISlotRule`, `IGenerateOptions`, `IManifestLike`, `IManifestResolver`

## Docs

- OWNERSHIP: [`./OWNERSHIP.md`](./OWNERSHIP.md)
- Zone canon: [`docs/_meta/web-zones/runtime.md`](../../../../docs/_meta/web-zones/runtime.md)
- Sister: [`@capsuletech/studio`](../../studio/) consumes data-gen for palette templates + provides manifest registry.
