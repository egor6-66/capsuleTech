/**
 * Shared styling base for the input-field family: Input, Textarea, Select.
 *
 * All three consume this constant as their CVA base string so that
 * layout, focus appearance, and border are identical by construction.
 *
 * ## Sizing
 *
 * The base carries `px-input` (horizontal padding only).
 * Height is controlled per-control:
 *   - Input        → `h-9` in inputCva (fixed, shadcn canon)
 *   - Select trigger → `h-9` in selectTriggerCva (fixed, shadcn canon)
 *   - Textarea     → `min-h-[80px] py-input` in textareaCva (multiline, no fixed height)
 *
 * This eliminates the `h-auto + py-*` pattern that caused button/input height
 * divergence and loader-induced button height jumps.
 *
 * ## 3-state background (empty → filled → active)
 *
 *   1. empty   — `bg-transparent`         blends with parent background
 *   2. filled  — `bg-muted/40`            subtle tint; driven by per-variant
 *                  data-attribute (differs between native inputs and Kobalte).
 *   3. active  — `bg-background`          "lifts" control + ring; driven by
 *                  `:focus` (Input/Textarea) or `data-[expanded]` (Select).
 *
 * ## Focus ring
 *
 * Uses a SINGLE clean ring (shadcn canon): `focus:ring-1 focus:ring-ring`.
 * The border is NOT switched to `--ring` on focus — that would produce a
 * heavy doubled purple line. The ring alone gives a clear, tasteful affordance
 * consistent with shadcn/ui style.
 *
 * Uses `:focus` (not `:focus-visible`) so the ring appears consistently on
 * both keyboard Tab navigation AND mouse click.  Select mirrors this via
 * `data-[expanded]:ring-1 data-[expanded]:ring-ring` in its own variant file.
 *
 * Relies on `--ring`, `--border`, `--input` tokens from `@capsuletech/web-style`.
 * Do not work around missing token values here — fix them in web-style themes.
 */
export const INPUT_FIELD_BASE = [
  // Layout & sizing — common to all three controls
  'flex w-full rounded-md border border-input text-sm shadow-sm',
  // Horizontal padding shared by all three; height controlled per-control
  'px-input',
  // Transition covers bg, border colour, and box-shadow (ring)
  'transition-[background-color,border-color,box-shadow] duration-200',
  // Background state 1: empty
  'bg-transparent',
  // Background state 3: active/focused — wins over filled (declared after)
  'focus:bg-background',
  // Focus ring — single clean ring, no border-colour change (avoids doubled purple)
  'focus:outline-none focus:ring-1 focus:ring-ring',
  // Placeholder
  'placeholder:text-muted-foreground',
  // Disabled
  'disabled:cursor-not-allowed disabled:opacity-50',
].join(' ');
