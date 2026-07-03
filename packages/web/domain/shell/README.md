# @capsuletech/web-shell

App-shell блоки capsule (chrome с логикой): Header, ModeToggle, Picker, ThemePicker, Layout — переиспользуются между capsule-аппами.  ·  zone: **domain**  ·  status: **alpha (0.1.0)**

Tier-2 в двухъярусной модели — connected-контролы поверх stateless `@capsuletech/web-ui`. Параметризуется через subpath-блоки (`/ui`, `/controllers`, `/capsule`).

> **Migration в полёте:** Matrix-subpath будет эвакуирован в `@capsuletech/boost-matrix` per [[046-boost-namespace-matrix-evict-vt-owner|ADR 046]] D2 (Phase B2 plan-doc). Apps'ы используют `@capsuletech/boost-matrix` для grid; shell = только chrome.

## Install

```bash
pnpm add @capsuletech/web-shell
# peer deps:
pnpm add solid-js
```

## Minimum usage

```tsx
// apps/<app>/src/widgets/header.tsx
import { Header } from '@capsuletech/web-shell/chrome';

export default Widget((Ui) => (
  <Header navigation={Shapes.Shell.Navigation} />
));
```

## Subpath exports

- `/chrome` — Header / Layout / Footer (chrome блоки).
- `/ui` — UI-блоки (ModeToggle, Picker — generic каркас селекта, ThemePicker — тонкий wrapper над Picker, WidgetSettingsToggle).
- `/controllers` — `Controllers.Shell.*` HCA-адаптер (useEmit, ADR 032).
- `/capsule` — `defineCapsuleModule` manifest (ADR 033).
- ~~`/matrix`~~, ~~`/layout`~~ — DEPRECATED, removed в Phase B2 (используй `@capsuletech/boost-matrix`).

## Docs

- AI-anchor: [`docs/_meta/web-shell.md`](../../../docs/_meta/web-shell.md) _(TBD)_
- Zone canon: [`docs/_meta/web-zones/domain.md`](../../../docs/_meta/web-zones/domain.md)
- OWNERSHIP: [`./OWNERSHIP.md`](./OWNERSHIP.md)
- ADR 046 (Matrix eviction), ADR 032 (package /controllers + useEmit), ADR 033 (defineCapsuleModule), ADR 047 D2 (no horizontal between domain).
