import { BaseProviders } from '@capsule/web-core/providers';
import './app-config.gen';
import * as _registry from './registry/wrappers';
import { routeTree } from './routes/routeTree.gen';

Object.assign(globalThis, _registry);

export const Bootstrap = () => {
  return <BaseProviders routeTree={routeTree} />;
};
