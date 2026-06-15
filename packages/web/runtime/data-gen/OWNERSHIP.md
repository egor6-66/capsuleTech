---
name: "@capsuletech/data-gen"
owner-agent: owner-data-gen
group: web_base
zone: runtime
status: alpha
priority: P2
last_updated: 2026-06-13
---

# OWNERSHIP — @capsuletech/data-gen

**Owner agent:** `owner-data-gen` (TODO — пока главный steward)
**Package path:** `packages/web/runtime/data-gen/`
**Release group:** `web_base` (tag `web@{version}`)

## Состояние

- **Zone:** `runtime` (per ADR 047 D1).
- **Status:** `alpha` (0.0.0) — extract'нут из `@capsuletech/web-studio/generators` в S1 (2026-06-13). Engine pure, без зависимостей на studio. Apps могут потреблять напрямую.
- **Priority:** **P2** — поддержка studio + future use в apps (mock data, landing demos, test-стенды).
- **Maturity bar:** unit-tests на engine/rng/fuzzer (присутствуют) + smoke на presets. Public API стабилен.

## Vendor stack (ADR 047 D3)

- **Solid.js** (`solid-js` `^1.9.12`, peerDep) — реактивный фреймворк. Используется только для JSX-типов в test-окружении. https://docs.solidjs.com/
- **`@capsuletech/shared-zod`** (через peer pattern fuzzer'а) — `ZodTypeAny` opaque type для propsSchema. Consumer (studio/apps) приносит свой zod-реестр через `IManifestResolver`. https://zod.dev/

Никаких UI / DOM / framework-вендоров — data-gen pure logic. Tree generation engine (mulberry32 RNG + recursive descent).

## Зона ответственности

Procedural UI-tree generation:

- **engine** — `generate(preset, options) → IEditorTree`. Recursive descent по `IPreset` с pickWeighted на каждом слоте.
- **rng** — mulberry32 RNG. `createRng(seed)`, `coin`, `pick`, `pickWeighted`, `randomInt`, `seededId`.
- **fuzzer** — `fuzzProps(rng, schema, defaults)`. Заполняет props на основе zod-схемы.
- **presets** — `FORM_PRESET`, `CARD_PRODUCT_PRESET`, `LAYOUT_2COL_PRESET`, `BUTTON_*_PRESET`, `TYPOGRAPHY_*_PRESET`. Стартовый набор грамматик.
- **wordbank** — RU-словари для FIELD_LABELS/CARD_TITLES/BUTTON_TEXTS.
- **types** — `IEditorNode`/`IEditorTree`/`NodeId` (canonical JSON-UI-tree shape, used also by `@capsuletech/web-renderer` + `@capsuletech/web-studio/state`).

## Public API

| Export | Purpose |
|---|---|
| `generate(preset, options?)` | Build tree from preset; deterministic via seed |
| `IGenerateOptions.resolveManifest?` | Inject manifest registry for fuzzer; engine remains pure |
| `IManifestLike`, `IManifestResolver` | Shape contracts for the resolver |
| `IEditorTree`, `IEditorNode`, `NodeId` | Canonical tree shape |
| `IPreset`, `ISlotPick`, `ISlotRule`, `IPropsRefiner` | Preset grammar types |
| `FORM_PRESET`, `CARD_PRODUCT_PRESET`, ... | Stock presets |
| `coin`, `createRng`, `pick`, `pickWeighted`, `randomInt`, `seededId`, `Rng` | RNG primitives |
| `fuzzProps` | Standalone fuzzer (used by engine, exported for tooling) |
| `FIELD_LABELS`, `CARD_TITLES`, etc. | Wordbank (RU strings for prop fuzzing) |
| `labelToInputType`, `labelToPlaceholder` | Wordbank helpers |

## Известные ограничения

1. **No reactivity** — это generator, не runtime UI. Solid-js peer только для type-checking в tests.
2. **Опциональный manifest resolver** — без него engine генерит nodes с пустыми props (deterministic, но не fuzz'ятся).
3. **Tree shape coupling** — `IEditorNode` shape должен оставаться компатибельным с `@capsuletech/web-renderer`'s `ISchema.components.nodes[id]`. При breaking — координировать с owner-web-renderer.

## Roadmap

- [ ] Документация usage-patterns в README (engine intro + preset authoring + manifest resolver injection)
- [ ] Расширить preset-стартовый набор (navigation, hero-section, footer)
- [ ] Audience: добавить `EN` wordbank (i18n генерации)
- [ ] Migration guide для apps (mock-data sources, landing demos)
