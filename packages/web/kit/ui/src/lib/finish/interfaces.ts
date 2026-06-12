import type { JSX } from 'solid-js';

// IFinishConfig — канонический тип теперь живёт в @capsuletech/web-style.
// Ре-экспортируем здесь для обратной совместимости (консьюмеры, импортирующие
// из '@capsuletech/web-ui' или 'lib/finish', получают тот же тип).
export type { IFinishConfig } from '@capsuletech/web-style';

export interface IFinishContract {
  /**
   * Returns inline style object for the surface layer when finish mode is active,
   * or an empty object `{}` when inactive (consumer's own class/style takes over).
   *
   * Designed to replace / extend `background` and `box-shadow` keys in the
   * surface element's `style` attribute.
   */
  surfaceStyle: () => JSX.CSSProperties;
}
