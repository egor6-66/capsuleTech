## 0.2.0 (unreleased)

**BREAKING:** Package renamed `@capsuletech/web-editor` → `@capsuletech/web-ui-creator`. Directory `packages/web/editor/` → `packages/web/ui-creator/`. Update imports: `from '@capsuletech/web-editor/...'` → `from '@capsuletech/web-ui-creator/...'`.

- New subpath `/generators` — procedural UI generators (seedable RNG, declarative presets). Phase 1: `form` preset.

## 0.1.1 (2026-05-18)

Initial release as `@capsuletech/web-editor`. Consolidates three previously-separate packages with subpath exports:
- `@capsuletech/web-editor/manifests` (was `@capsuletech/web-manifests`)
- `@capsuletech/web-editor/state` (was `@capsuletech/web-editor-state`)
- `@capsuletech/web-editor/inspector` (was `@capsuletech/web-inspector`)
