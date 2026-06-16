/**
 * Info-панель студио: stateless презентация + contract-resolver.
 * Подключается через controller `WebStudioInfo` (см. `../controllers`).
 */

export { Info } from './Info';
export { EmptyState } from './EmptyState';
export { getContract, hasContract } from './contract-registry';
export type {
  IContractBlockProps,
  IInfoProps,
  IManifestBlockProps,
  IReadmeBlockProps,
} from './types';
