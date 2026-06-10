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
 *                  `:focus-visible` (Input/Textarea) or `data-[expanded]` (Select).
 *
 * ## Active state lives on the CONTROL, not here
 *
 * The base intentionally does NOT carry the focus ring or the active background.
 * Those differ by control and are declared per-CVA:
 *   - Input / Textarea → `focus-visible:ring-1 focus-visible:ring-ring`
 *                         `focus-visible:bg-background`
 *     (browsers set `:focus-visible` on editable fields for any focus event, so
 *     the ring shows on mouse-click as well — desired for text fields.)
 *   - Select trigger   → `data-[expanded]:ring-1 data-[expanded]:ring-ring`
 *                         `data-[expanded]:bg-background`  (open-state ONLY)
 *
 * Why the split: Kobalte programmatically restores focus to the trigger when the
 * dropdown closes. On Chromium that restore matches `:focus-visible`, so a
 * focus-visible ring on the trigger re-lights after a mouse click-away ("ring
 * goes out → comes back → needs a second click to clear"). Keeping the trigger's
 * ring on `data-[expanded]` alone removes that false re-light entirely.
 *
 * The base keeps `outline-none` unconditionally so the native focus outline never
 * competes with the control-supplied ring.
 *
 * ## Focus ring colour
 *
 * A single clean ring (shadcn canon). The border is NOT switched to `--ring` on
 * focus — that would produce a heavy doubled purple line.
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
  // Suppress native outline; the active ring is supplied per-control
  'outline-none',
  // Placeholder
  'placeholder:text-muted-foreground',
  // Disabled
  'disabled:cursor-not-allowed disabled:opacity-50',
].join(' ');
