/**
 * `@capsuletech/web-shell/ui` — connected app-shell blocks.
 *
 * One folder per block (its component + interfaces + any local config). The
 * barrel re-exports each block's public surface; Header and future blocks add a
 * sibling folder rather than piling files at this level.
 */
export * from './appearance';
export * from './finishSettings';
export * from './header';
export * from './localePicker';
export * from './modeToggle';
export * from './themePicker';
