/**
 * Типы info-панели. Stateless props — controller (WebStudioInfo) резолвит
 * данные из shared selection и прокидывает сюда.
 */

import type { Contract } from '@capsuletech/web-contract';
import type { IPreset, IPrimitiveManifestEntry } from '@capsuletech/web-ui/manifest';

export interface IInfoProps {
  /** Выбранный пресет (для description + label в Manifest-блоке). */
  preset: IPreset;
  /** Dot-path корневой ноды пресета — резолвится в controller'е. */
  type: string;
  /** Манифест корневого компонента (`undefined` если не зарегистрирован). */
  manifest: IPrimitiveManifestEntry | undefined;
  /** Контракт корневого компонента (`undefined` если не описан). */
  contract: Contract | undefined;
}

export interface IContractBlockProps {
  contract: Contract | undefined;
  type: string;
}

export interface IManifestBlockProps {
  manifest: IPrimitiveManifestEntry | undefined;
  preset: IPreset;
  type: string;
}

export interface IReadmeBlockProps {
  type: string;
  manifest: IPrimitiveManifestEntry | undefined;
}
