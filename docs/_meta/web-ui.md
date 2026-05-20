---
tags: [meta, web-ui]
updated: 2026-05-20
---

# web-ui AI anchor

Quick orientation for Claude instances working in `packages/web/ui/`.

## Owner prompt

Full context: `.claude/agents/owner-web-ui.md` (system prompt of owner agent).
Conventions canon: `docs/09-packages/ui/conventions.md`.
Storybook guide: `docs/09-packages/ui/storybook.md`.

## Changelog (notable breaks)

### 0.2.0 — Layout refactor (2026-05-20)

**Breaking: `variant` prop removed from `<Layout>`.**

Old API (4 variants):
```tsx
<Ui.Layout variant="holy-grail" slots={{ header, left, main, right, footer }} />
<Ui.Layout variant="dashboard"  slots={{ header?, sidebar, main, rightBar? }} />
<Ui.Layout variant="standard"   slots={{ header, main, footer }} />
<Ui.Layout variant="centroid"   slots={{ main }} />
```

New API (single component, 5 optional slots):
```tsx
<Ui.Layout
  slots={{
    main: <X />,         // REQUIRED
    header?: <Y />,
    sidebar?: <Y />,     // left column (replaces "left" from holy-grail)
    rightBar?: <Y />,    // right column (replaces "right" from holy-grail)
    footer?: <Y />,
  }}
/>
```

Migration guide:
- `centroid` → omit all optional slots (only `main`). Auto-centroid mode activates automatically.
- `standard` → `{ header, main, footer }` (same names).
- `dashboard` → `{ header?, sidebar, main, rightBar? }` (same names).
- `holy-grail` → `{ header, sidebar, main, rightBar, footer }` (`left` → `sidebar`, `right` → `rightBar`).

Resize behaviour is unchanged — `Layout.slot({ resizable: true, initialSize, minSize, maxSize })`.

Bug fixed: fixed (non-resizable) header/footer are no longer pushed into the corvu Resizable
group, so `fillInitialSizes` no longer steals height from them.

Deleted files: `standard.tsx`, `dashboard.tsx`, `holy-grail.tsx`, `switch.tsx`.
