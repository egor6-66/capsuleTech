import { createMemo } from 'solid-js';
import { type IFinishConfig, useFinishConfig, useFinishMode } from '@capsuletech/web-style';

import type { IFinishContract } from './interfaces';

// Re-export the canonical type so consumers that imported from lib/finish keep working.
export type { IFinishConfig } from '@capsuletech/web-style';

/**
 * `createFinish` — headless surface-finish hook.
 *
 * Returns a reactive `surfaceStyle()` accessor that emits:
 *   - **Finish ON**  → gradient + top hairline + inner border + depth shadow/glow
 *   - **Finish OFF** → `{}` (no-op; consumer's own background class/style takes over)
 *
 * ## Activation
 * Reads the global `useFinishMode()` signal from `@capsuletech/web-style`.
 * Toggling the signal (e.g. via `setFinishMode(true)`) instantly updates all
 * mounted surfaces without re-mount or DOM walk.
 *
 * ## Config
 * Default values come from `useFinishConfig()` (also from `@capsuletech/web-style`).
 * Pass a `config` partial to override individual knobs per-instance.
 *
 * ## Opaque mode (overlays)
 * Pass `{ opaque: true }` for surfaces that float **over** other content
 * (Dropdown / Popover / Select panels, Modal). The finish gradient is then
 * emitted as `background-image` instead of the `background` shorthand, so the
 * element's own opaque `bg-popover` / `bg-card` background-COLOUR stays as a
 * solid base — the glass gradient/hairline/glow style is preserved but nothing
 * behind the panel bleeds through. Inline content surfaces (Card, widget-frame)
 * omit it and keep their translucent glass over the ambient.
 *
 * @param config  Optional partial override of tuning values, plus the structural
 *                `opaque` flag.
 *
 * @example
 * ```ts
 * const finish = createFinish();             // inline surface (translucent)
 * const finish = createFinish({ opaque: true }); // overlay surface (solid base)
 * // in JSX:
 * <div style={finish.surfaceStyle()} />
 * ```
 */
export function createFinish(
  config?: Partial<IFinishConfig> & { opaque?: boolean },
): IFinishContract {
  // Split the structural `opaque` flag from the tunable config overrides.
  const { opaque = false, ...overrides } = config ?? {};

  // ── isActive ─────────────────────────────────────────────────────────────
  // Pure signal read — no DOM walk, no ref, no timing dependency.
  const isActive = createMemo(() => useFinishMode()());

  // ── surfaceStyle ─────────────────────────────────────────────────────────
  const surfaceStyle = createMemo((): import('solid-js').JSX.CSSProperties => {
    if (!isActive()) {
      return {};
    }

    // Merge global store config with per-instance overrides.
    const cfg: IFinishConfig = { ...useFinishConfig()(), ...overrides };

    // ── ON: approved finish effect ────────────────────────────────────────

    const topPct       = pct(cfg.topForegroundAlpha);
    const hairPct      = pct(cfg.hairlineAlpha);
    const borderPct    = pct(cfg.innerBorderAlpha);
    const glowPct      = pct(cfg.glowAlpha);
    const innerGlowPct = pct(cfg.innerGlowAlpha);

    // Three-stop gradient — surfaceAlpha controls card-colour opacity in each stop.
    const cardBase = cfg.surfaceAlpha === 1
      ? 'var(--card)'
      : `color-mix(in srgb, var(--card) ${pct(cfg.surfaceAlpha)}%, transparent)`;

    const topStop = `color-mix(in srgb, var(--foreground) ${topPct}%, ${cardBase})`;
    const midStop = `color-mix(in srgb, ${cardBase} ${pct(cfg.midCardAlpha)}%, transparent)`;
    const botStop = `color-mix(in srgb, var(--primary) ${pct(cfg.bottomPrimaryAlpha)}%, ${cardBase})`;

    const linearGradient = [
      'linear-gradient(180deg,',
      `  ${topStop} ${cfg.topStopPosition}%,`,
      `  ${midStop} ${cfg.midStopPosition}%,`,
      `  ${botStop} ${cfg.bottomStopPosition}%)`,
    ].join('\n');

    // Optional centre-glow radial layer (rendered ABOVE the linear gradient).
    const bgLayers: string[] = [];
    if (cfg.centerGlowAlpha > 0) {
      const cgPct = pct(cfg.centerGlowAlpha);
      bgLayers.push(
        `radial-gradient(${cfg.centerGlowSize} ${cfg.centerGlowSize} at 50% 50%, color-mix(in srgb, var(--primary) ${cgPct}%, transparent) 0%, transparent 70%)`,
      );
    }
    bgLayers.push(linearGradient);

    const background = bgLayers.join(', ');

    // Four-layer box-shadow composition:
    //   1. inset hairline — 1 px top-edge bright highlight
    //   2. inset inner border — full 1 px perimeter contour
    //   3. contact shadow — tight dark drop   (omitted when innerOnly)
    //   4. depth glow — soft coloured ambient (omitted when innerOnly)
    const hairline    = `inset 0 1px 0 color-mix(in srgb, var(--foreground) ${hairPct}%, transparent)`;
    const innerBorder = `inset 0 0 0 1px color-mix(in srgb, var(--foreground) ${borderPct}%, transparent)`;

    const shadowLayers: string[] = [hairline, innerBorder];
    if (cfg.innerGlowAlpha > 0) {
      shadowLayers.push(
        `inset 0 0 24px color-mix(in srgb, var(--primary) ${innerGlowPct}%, transparent)`,
      );
    }
    if (!cfg.innerOnly) {
      const glow = `${cfg.glowSpread} color-mix(in srgb, var(--primary) ${glowPct}%, transparent)`;
      shadowLayers.push(cfg.contactShadow, glow);
    }

    const boxShadow = shadowLayers.join(', ');

    // Opaque overlays: emit the gradient as `background-image` so the element's
    // own opaque `bg-popover` / `bg-card` background-COLOUR stays as a solid base
    // (the `background` shorthand would reset it to transparent → content bleeds
    // through). Inline surfaces keep the shorthand for their translucent glass.
    return opaque
      ? { 'background-image': background, 'box-shadow': boxShadow }
      : { background, 'box-shadow': boxShadow };
  });

  return { surfaceStyle };
}

// ---------------------------------------------------------------------------
// Internal helper
// ---------------------------------------------------------------------------

/** Converts 0–1 alpha to integer percentage string for color-mix(). */
function pct(alpha: number): number {
  return Math.round(alpha * 100);
}
