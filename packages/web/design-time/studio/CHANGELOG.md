## 0.0.0 (D4 — 2026-06-12)

**BREAKING:** Package renamed `@capsuletech/web-ui-creator` → `@capsuletech/studio` per ADR 047 D4. Directory `packages/web/design-time/ui-creator/` → `packages/web/design-time/studio/`. Empty `@capsuletech/web-creator` skeleton dropped; its design-time-orchestrator role consolidated into `@capsuletech/studio`. Update imports: `from '@capsuletech/web-ui-creator/...'` → `from '@capsuletech/studio/...'`. Six subpaths preserved (`/manifests | /state | /inspector | /generators | /controllers | /capsule`).

## 0.2.0 (deprecated — superseded by 0.0.0 above after D4 rename)

**BREAKING:** Package renamed `@capsuletech/web-editor` → `@capsuletech/studio`. Directory `packages/web/editor/` → `packages/web/ui-creator/`. Update imports: `from '@capsuletech/web-editor/...'` → `from '@capsuletech/studio/...'`.

- New subpath `/generators` — procedural UI generators (seedable RNG, declarative presets). Phase 1: `form` preset.

## 0.1.1 (2026-05-18)

Initial release as `@capsuletech/web-editor`. Consolidates three previously-separate packages with subpath exports:
- `@capsuletech/web-editor/manifests` (was `@capsuletech/web-manifests`)
- `@capsuletech/web-editor/state` (was `@capsuletech/web-editor-state`)
- `@capsuletech/web-editor/inspector` (was `@capsuletech/web-inspector`)
