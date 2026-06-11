# @capsuletech/web-creator

Единый design-time пакет capsule — редакторы (style/ui/text/logic/app) + общие тулзы (shell/palette/tree/inspector/canvas/data/monitor/catalog/docs) через subpath'ы.  ·  zone: **design-time**  ·  status: **scaffold (0.0.0)**

Поглощает `@capsuletech/web-ui-creator` (ADR 045 #2) и переименовывается в `@capsuletech/studio` (ADR 047 D4, Phase D4 web-rework-plan).

## Install

```bash
pnpm add @capsuletech/web-creator
# peer deps (требуются в host'е):
pnpm add solid-js
```

## Minimum usage

> **STATUS: scaffold** — публичный API в разработке (F2-F4). Минимальный пример появится после F2 (catalog subpath).

```tsx
// Целевой shape (после F3):
import { Editor } from '@capsuletech/web-creator/shell';
import { useUserKit } from './my-kit';

<Editor.Provider kit={useUserKit()}>
  <Editor.Palette />
  <Editor.Tree />
  <Editor.Canvas />
  <Editor.Inspector />
</Editor.Provider>
```

## Subpath exports (целевые)

**Тулзы:** `/shell` · `/palette` · `/tree` · `/inspector` · `/canvas` · `/data` · `/monitor` · `/catalog` · `/docs`

**Редакторы:** `/style` · `/ui` · `/text` · `/logic` · `/app`

## Docs

- AI-anchor: [`docs/_meta/web-ui-creator.md`](../../../docs/_meta/web-ui-creator.md) (после absorb — `docs/_meta/studio.md`)
- Zone canon: [`docs/_meta/web-zones/design-time.md`](../../../docs/_meta/web-zones/design-time.md)
- OWNERSHIP: [`./OWNERSHIP.md`](./OWNERSHIP.md)
- Planning: [`docs/playground/creator.md`](../../../docs/playground/creator.md) (founding F2-F4 plan).
- ADR 045 #2 (creator absorb ui-creator), ADR 047 D4 (rename → studio).
