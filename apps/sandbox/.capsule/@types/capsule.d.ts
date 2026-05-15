import type { ICapsuleConfig } from '@capsule/shared-vite';
import type { IAppConfig } from '@capsule/web-core';

declare global {
  function defineCapsuleConfig(config: ICapsuleConfig): ICapsuleConfig;
  function defineAppConfig<const T extends IAppConfig>(config: T): T;
}
