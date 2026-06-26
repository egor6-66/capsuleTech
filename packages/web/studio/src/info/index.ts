/**
 * Info-панель студио: stateless презентация + connected-обёртка `InfoPanel`.
 * Регистрируется как `WebStudio.Info` через `../capsule` (ADR 033).
 */

export { EmptyState } from './EmptyState';
export { Info } from './Info';
export { InfoPanel } from './InfoPanel';
export type {
  IContractBlockProps,
  IInfoProps,
  IManifestBlockProps,
  IReadmeBlockProps,
} from './types';
