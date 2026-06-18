---
title: docs-consumer-integration
description: How apps wire `@capsuletech/web-docs` to consume the build-time-generated docs registry — DI shape, tsconfig alias, build ordering, sample wiring. Single-page guide for E5 consumers.
status: documented
type: guide
last_updated: 2026-06-13
audience: [agent, dev]
tags: [meta, docs-as-data]
---

# Docs consumer integration (ADR 048 E5)

> Quick guide for app authors who want to render in-app docs via `<DocSection slug="..."/>` or `<DocPage slug="...">`. Implementation reference: `packages/web/studio/src/docs/` (E4 PR #345).

## TL;DR {#tldr}

1. Run `pnpm docs:build` (creates `docs/.generated/registry.{ts,json}`).
2. Import the registry via `@capsule/docs-registry` alias.
3. Wrap app root in `<DocsProvider registry={docs}>`.
4. Use `<DocSection>` / `<DocPage>` / `useDoc()` anywhere downstream.

## Why DI (registry as prop, not magic import) {#why-di}

Per E4 CP decision Q2 (user-approved 2026-06-13):

- **Apps source the registry** — they decide when to load it (static / lazy / fetch).
- **Studio just renders** — no Vite-plugin magic, no fetch coupling, no hardcoded path.
- **Composition rule canon** — studio = host/composer; data lives in app land.

This keeps the consumer simple: apps that don't use docs incur zero cost.

## Step 1 — Generate the registry {#step-generate}

```bash
pnpm docs:build
# → docs/.generated/registry.ts
# → docs/.generated/registry.json
```

CI runs the extractor as part of the `Docs build (ADR 048 E6)` job. For local dev, run it once after pulling main; re-run on demand (or wire as `prebuild` hook in the app).

The registry is **gitignored** (`docs/.generated/`) — regenerated artifact.

## Step 2 — Path alias {#step-alias}

The repo-wide `tsconfig.base.json` already exposes the registry:

```jsonc
{
  "compilerOptions": {
    "paths": {
      "@capsule/docs-registry": ["docs/.generated/registry.ts"]
    }
  }
}
```

Vite + tsc auto-resolve via `tsconfig-paths`. No per-app config needed.

## Step 3 — Wrap app root {#step-provider}

```tsx
// apps/<app>/src/App.tsx
import { DocsProvider } from '@capsuletech/web-docs';
import { docs } from '@capsule/docs-registry';

export default function App() {
  return (
    <DocsProvider registry={docs}>
      {/* the rest of the app tree */}
    </DocsProvider>
  );
}
```

`docs` is the registry literal — TypeScript autocompletes available slugs from the typed shape.

## Step 4 — Render sections {#step-render}

```tsx
import { DocSection, DocPage, useDoc } from '@capsuletech/web-docs';

// Single section (most common — e.g. footer "About", page hint)
<DocSection slug="architecture/adr/048-docs-as-data#D4" />

// Audience-filtered (drops `<!-- audience: ... -->` blocks not in `audience`)
<DocSection slug="architecture/adr/048-docs-as-data#D4" audience={['user']} />

// Full doc
<DocPage slug="architecture/adr/048-docs-as-data" />

// Programmatic access
const adr = useDoc('architecture/adr/048-docs-as-data');
if (adr) console.log(adr.meta.title, adr.sections.D4.body);
```

## Build ordering {#build-order}

The registry must exist **before** the app builds. Add to `apps/<app>/package.json`:

```jsonc
{
  "scripts": {
    "prebuild": "pnpm -w docs:build",
    "build": "vite build"
  }
}
```

Or rely on CI ordering (the docs-build job runs in parallel with other CI jobs; for end-to-end build chains in CI, ensure docs-build precedes the consumer-app build).

## Styling {#styling}

`<DocSection>` / `<DocPage>` accept an optional `class` prop. Capsule consumers wire `@capsuletech/web-style` + Tailwind v4 classes — no styling is baked in.

For prose-grade rendering, consider `class="prose"` (`@tailwindcss/typography`) — the marked output is standard markdown HTML.

## Audience filter {#audience}

Per canon §3, doc sections may contain `<!-- audience: X -->...<!-- /audience -->` blocks. The `audience` prop filters at body-level:

- `audience={['user']}` — keeps only `<!-- audience: user -->` blocks (and any block listing `user`)
- `audience` omitted — no filter; all blocks rendered (markers stripped)
- `audience={[]}` — same as omitted

## Error handling {#errors}

Missing slug or section → fallback. Default fallback renders a `.studio-docs-missing` element with `data-slug` — visible in dev, easily styled-away in prod.

Custom fallback:

```tsx
<DocSection slug="missing-doc" fallback={<div>No documentation available</div>} />
```

## Out of scope {#out-of-scope}

- **Markdown extensions** — `marked@9` GFM only. Syntax highlighting, math, custom containers are post-launch additions.
- **Wikilink rewrite** — `[[name]]` renders as literal text. Future enhancement: rewrite to `<a href="#slug">` against the registry.
- **Live re-extract on file save** — extractor runs build-time only. For doc-authoring dev loops, re-run `pnpm docs:build`.

## Related {#related}

- [[048-docs-as-data|ADR 048]] D5 — consumer pattern
- [[docs-system]] — full canon (section-IDs, frontmatter, audience, slug)
- [[web-rework-plan]] Phase E — execution status
- `packages/web/studio/src/docs/` — implementation reference
