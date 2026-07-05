import type { AccordionPreset, IAccordionProps } from './interfaces';

/**
 * The subset of root props a preset may supply. Kept narrow on purpose: a
 * preset only carries *look* + *behaviour-mode* defaults, never layout values
 * (`fluid`) or per-instance state (`defaultValue`) — those stay explicit.
 */
export type IAccordionPresetConfig = Partial<
  Pick<IAccordionProps, 'bordered' | 'multiple' | 'density'>
>;

/**
 * Frozen preset registry. `segmented` = the studio component-palette look
 * (bordered stroke + multiple-open + compact triggers). Values are pure token
 * compositions (ADR 042); no new classes are introduced here.
 */
export const ACCORDION_PRESETS: Record<AccordionPreset, IAccordionPresetConfig> = {
  segmented: { bordered: true, multiple: true, density: 'compact' },
};

/**
 * Resolve a preset name to its config bundle. Unknown / undefined name → empty
 * config (so `resolveAccordionPreset(x).bordered` is always safe to read).
 */
export const resolveAccordionPreset = (preset?: AccordionPreset): IAccordionPresetConfig =>
  preset ? (ACCORDION_PRESETS[preset] ?? {}) : {};
