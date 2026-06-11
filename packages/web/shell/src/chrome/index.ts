/**
 * `@capsuletech/web-shell/chrome` — tier-2 connected app-shell blocks (ADR 045).
 *
 * Logic-bearing chrome: Header, ModeToggle, Appearance, FinishSettings,
 * ThemePicker, LocalePicker — all wired to module-level state
 * (`@capsuletech/web-style`, `@capsuletech/web-auth`).
 *
 * Also re-exports the HCA Controllers.Shell namespace (ADR 032, `useEmit`)
 * for consumers that need the full connected layer in one import.
 */
export * from '../ui';
export * from '../controllers';
