/**
 * Info-панель студио: stateless презентация + contract-resolver.
 * Подключается через controller `WebStudioInfo` (см. `../controllers`).
 */

export { getContract, hasContract } from './contract-registry';
export { EmptyState } from './EmptyState';
export { Info } from './Info';
export type {
  IContractBlockProps,
  IInfoProps,
  IManifestBlockProps,
  IReadmeBlockProps,
} from './types';
