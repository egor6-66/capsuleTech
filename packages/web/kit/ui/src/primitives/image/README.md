---
title: Image
status: documented
type: primitive
audience: dev
tags: [web-ui, primitive, image, media]
last_updated: 2026-07-03
slug: web-ui/primitives/image
---

# Image {#image}

Stateless responsive image primitive (`@capsuletech/web-ui`). Backed by `@kobalte/core/image` for a11y and semantic structure. Supports two shape variants (`square` / `circle`) and five size options (`xs` / `sm` / `md` / `lg` / `xl`) using density-aware tokens. Fallback JSX content for loading/error states.

> Импорт: `import { Image } from '@capsuletech/web-ui/image';`

## Когда использовать {#usage}

- **Avatar patterns:** `shape="circle"` with fallback (e.g., initials, icon) when image load fails or is pending.
- **Thumbnails:** `shape="square"` with size variants for gallery previews, list items, inline content.
- **User profiles:** Large circular images with fallback as primary or secondary avatar display.
- Fallback logic driven entirely by `@kobalte/core/image` — no internal state.

## Props {#props}

| Prop | Type | Default | Назначение |
|---|---|---|---|
| `src` | `string` | required | Image URL |
| `alt` | `string` | required | Alt text for accessibility |
| `shape` | `'square' \| 'circle'` | `'square'` | Visual shape variant |
| `size` | `'xs' \| 'sm' \| 'md' \| 'lg' \| 'xl'` | `'md'` | Token-based size (6/8/10/12/16px) |
| `fallback` | `JSX.Element` | — | Content to show on load/error (e.g., initials, icon) |
| `class` / `style` | `string` / `JSX.CSSProperties` | — | Applied to root wrapper |
| `...` | `ImgHTMLAttributes` | — | Standard `<img>` props (e.g., `title`, `loading`, `data-*`) |

```tsx
<Image src="/avatar.png" alt="User" shape="circle" size="md" />

<Image
  src={url}
  alt={name}
  shape="circle"
  size="lg"
  fallback={<span class="text-sm font-semibold">AB</span>}
/>
```

## Варианты {#variants}

### Shape

- `square` — rounded-md corners. Use for thumbnails, content boxes, gallery items.
- `circle` — rounded-full. Use for avatars, profile pictures, user indicators.

### Size

Token-based scale (using density-aware Tailwind tokens):
- `xs` — 6×6 (h-6 w-6)
- `sm` — 8×8 (h-8 w-8)
- `md` — 10×10 (h-10 w-10, default)
- `lg` — 12×12 (h-12 w-12)
- `xl` — 16×16 (h-16 w-16)

## Fallback {#fallback}

Fallback JSX content is rendered in an `Image.Fallback` container when:
- Image is loading
- Image fails to load (404, network error, etc.)

Common fallback patterns:

```tsx
// Initials (avatar pattern)
<Image
  src={userUrl}
  alt={userName}
  shape="circle"
  fallback={<span class="text-xs font-bold">{initials}</span>}
/>

// Icon placeholder
<Image
  src={iconUrl}
  alt="Icon"
  shape="square"
  fallback={<IconDefault size={20} />}
/>

// Color-coded circle with text
<Image
  src={url}
  alt={name}
  shape="circle"
  fallback={
    <div class="flex items-center justify-center w-full h-full bg-primary text-white text-xs font-bold">
      {initials}
    </div>
  }
/>
```

## Доступность {#a11y}

- `@kobalte/core/image` handles `role`, `aria-label`, `data-*` attributes for loading/error states.
- **Required:** `alt` prop must be descriptive and meaningful (not empty or "image").
- Fallback content is announced by screen readers; use semantic text or icons.

## Контракт для studio {#contract}

<!-- audience: agent -->
`image.contract.ts` — leaf; контракт-props: `src`, `alt`, `shape`, `size`. `class` — inspector-only, расширяется в `propsSchema` манифеста. Kobalte-first прецедент (2026-06-01): именованный импорт `import { Root as KobalteImageRoot, Img as KobalteImageImg, Fallback as KobalteImageFallback } from '@kobalte/core/image'`.
<!-- /audience -->

## Связанное {#related}

- [[web-ui/primitives/avatar|Avatar]] — composed over Image, adds circle-shape + string-fallback convenience.
- [[web-ui/primitives/skeleton|Skeleton]] — loading placeholder alternative.

## Known quirks {#quirks}

- **Fallback always rendered:** If `fallback` prop is provided, the `Image.Fallback` container is always in the DOM (hidden with `display: none` or similar by Kobalte when image loads). For minimal DOM, avoid fallback if not needed.
- **Object-fit:** Image uses `object-cover` by default; aspect ratio is forced to 1:1 (square). Override class to customize (e.g., `class="[&_img]:object-contain"`).
