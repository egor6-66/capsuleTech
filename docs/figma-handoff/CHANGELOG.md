# Design Token Changelog

Changes to skin-token VALUES in `packages/web/style/src/themes/`. Token NAMES are frozen (ADR 042).

---

## 2026-06-10 — Focus ring visibility fix (black theme dark mode)

**Scope:** `black` theme, dark block only (`[data-theme="black"].dark`).

**Problem:** `--ring`, `--border`, and `--input` were all set to the same value `oklch(0.1776 0 0)`, making the focus ring completely invisible — it blended with the input border on focus. Users had no distinguishable focused state on this palette in dark mode.

| Token | Old value | New value | Reason |
|---|---|---|---|
| `--ring` | `oklch(0.1776 0 0)` | `oklch(0.709 0 0)` | Focus ring was invisible — collided with `--border` and `--input` |
| `--sidebar-ring` | `oklch(0.1776 0 0)` | `oklch(0.709 0 0)` | Sidebar focus ring had the same collision |

**New value rationale:** `oklch(0.709 0 0)` is the mid-gray used as `--ring` in the light block of the same theme, and also equals `--muted-foreground` in dark mode. It is clearly visible against the pure-black background (`oklch(0 0 0)`) and the dark secondary surfaces (`oklch(0.1776 0 0)`), while remaining softer than the pure-white primary.

**Figma/Tokens Studio sync required:** update `black` theme dark-mode token set — `ring` and `sidebar-ring` from `oklch(0.1776 0 0)` to `oklch(0.709 0 0)` (hex approx: `#b3b3b3`).

**Other themes:** Audited all 11 themes (both light and dark blocks). No other themes had `--ring == --border == --input`. Borderline cases reviewed and found acceptable:
- `minimalNeutral` dark: ring L=0.556 vs border/input L=0.269 — delta sufficient, ring is visibly lighter.
- `vescrow` dark: ring has chroma advantage (`0.1557`) over border/input — distinguishable by color identity.
