export { flatten, type NestedDictionary } from './flatten';
export {
  getDefaultLocale,
  getLocale,
  getTenant,
  setDefaultLocale,
  setLocale,
  setTenant,
  useDefaultLocale,
  useLocale,
  useLocales,
  useTenant,
} from './locale';
export { type IIntlProviderProps, IntlProvider } from './provider';
export {
  getBaseDict,
  getRegisteredLocales,
  getTenantDict,
  registerCopy,
  registerTenantCopy,
} from './registry';
export { resolveCopy, useCopy } from './resolve';
export type {
  CopyResolver,
  Dictionary,
  ICopyBundle,
  Locale,
  Tenant,
} from './types';
