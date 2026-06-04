export type {
  CopyResolver,
  Dictionary,
  ICopyBundle,
  Locale,
  Tenant,
} from './types';

export {
  registerCopy,
  registerTenantCopy,
  getBaseDict,
  getTenantDict,
  getRegisteredLocales,
} from './registry';

export {
  useLocale,
  useTenant,
  useDefaultLocale,
  useLocales,
  setLocale,
  setTenant,
  setDefaultLocale,
  getLocale,
  getTenant,
  getDefaultLocale,
} from './locale';

export { resolveCopy, useCopy } from './resolve';

export { flatten, type NestedDictionary } from './flatten';

export { IntlProvider, type IIntlProviderProps } from './provider';
