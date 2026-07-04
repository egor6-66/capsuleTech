---
title: Avatar
status: documented
type: primitive
audience: dev
tags: [web-ui, primitive, avatar, user]
last_updated: 2026-07-03
slug: web-ui/primitives/avatar
---

# Avatar {#avatar}

Composed circular image primitive for user profiles and team member display (`@capsuletech/web-ui`). Thin wrapper over `Image` that forces circle shape and adds string-fallback convenience (initials wrapped in Typography). Inherits Image's accessibility, Kobalte backing, and Tailwind token-based sizing.

> Импорт: `import { Avatar } from '@capsuletech/web-ui/avatar';`

## Когда использовать {#usage}

- **User avatars:** Profile pictures with initials fallback (e.g., "JD" for John Doe).
- **Team member displays:** Comment threads, mentions, activity feeds, team pages.
- **Compact lists:** User directories, participant lists, mentions dropdowns.
- **Profile headers:** Large avatars with user initials or placeholder icon.

Avatar is always circular — no shape options. For square images, use `Image` directly.

## Props {#props}

| Prop | Type | Default | Назначение |
|---|---|---|---|
| `src` | `string` | required | Image URL |
| `alt` | `string` | required | Alt text for accessibility |
| `size` | `'xs' \| 'sm' \| 'md' \| 'lg' \| 'xl'` | `'md'` | Token-based size (6/8/10/12/16px) |
| `fallback` | `string \| JSX.Element` | — | Initials or JSX. String wrapped in Typography automatically. |
| `class` / `style` | `string` / `JSX.CSSProperties` | — | Applied to root wrapper |
| `...` | `ImgHTMLAttributes` | — | Standard `<img>` props (e.g., `title`, `loading`) |

```tsx
// String initials — auto-wrapped
<Avatar src={url} alt="John Doe" fallback="JD" />

// Custom JSX fallback
<Avatar
  src={url}
  alt="Jane"
  size="lg"
  fallback={<JaneIcon class="text-primary" />}
/>

// No fallback
<Avatar src={guaranteedUrl} alt="Profile" size="md" />
```

## Size {#size}

Reuses Image's token-based scale (density-aware):
- `xs` — 6×6 (h-6 w-6) — compressed mention badges
- `sm` — 8×8 (h-8 w-8) — compact lists, inline
- `md` — 10×10 (h-10 w-10, default) — standard profile
- `lg` — 12×12 (h-12 w-12) — detail pages
- `xl` — 16×16 (h-16 w-16) — hero profile headers

## Fallback {#fallback}

Two patterns:

**String (initials):**
```tsx
<Avatar src={url} alt="Alice Johnson" fallback="AJ" />
```
String is automatically centered, sized, and styled in a `<Typography variant="sm">` wrapper.

**Custom JSX:**
```tsx
<Avatar
  src={url}
  alt="No Image"
  fallback={
    <div class="flex items-center justify-center w-full h-full bg-primary text-white">
      <UserIcon size={20} />
    </div>
  }
/>
```
JSX passed as-is; caller is responsible for layout and styling.

## Доступность {#a11y}

- Inherits Kobalte Image's `role`, `data-*` attributes.
- **Required:** `alt` prop must describe the user or content (not "avatar" or empty).
- String fallback is semantically announced by screen readers (Typography renders plain text).
- Custom JSX fallback should be descriptive if icon-only (use `aria-label` if needed).

## Контракт для studio {#contract}

<!-- audience: agent -->
`avatar.contract.ts` — leaf; контракт-props: `src`, `alt`, `size`, `fallback` (string only; JSX is runtime enhancement). `class` — inspector-only, расширяется в `propsSchema` манифеста. Composed over Image (не переимплементирует Kobalte logic); относится к Image как к sibling primitive, не к-sub-component.
<!-- /audience -->

## Отличие от Image {#vs-image}

| Аспект | Image | Avatar |
|---|---|---|
| Shape | square \| circle | circle (forced) |
| Fallback | JSX only | string \| JSX |
| Use case | Thumbnails, content, any image | User profiles, team members |
| Composition | Standalone | Thin wrapper over Image |

## Связанное {#related}

- [[web-ui/primitives/image|Image]] — generic responsive image, shape+size variants.
- [[web-ui/primitives/skeleton|Skeleton]] — loading placeholder.

## Known quirks {#quirks}

- **String fallback auto-wrap:** If `fallback` is a string, Avatar wraps it in `Typography`. This auto-sizing may not match all design contexts; for full control, pass JSX instead.
- **Fallback always rendered:** Like Image, if `fallback` is provided, the container is in the DOM (hidden by Kobalte when image loads). For minimal DOM, omit fallback if not needed.
