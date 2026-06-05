// `api?:` ссылается на типы ApiConfig + MwToolbox из web-query. Это type-only
// зависимость web-core → web-query — она существует и так (web-core depends on
// web-query для runtime `getApiClient`). NB: исторически здесь стоял
// `declare module '@capsuletech/web-core/app-config' { interface IAppConfig {
// api?: ... } }` в `web-query/src/app-config-augment.ts`, но TS не резолвил
// этот augmentation (TS2664) — у web-query нет dep на web-core, и paths/exports
// его не вытягивали в context augmentation. Вернули inline-объявление здесь —
// type-inversion приемлема, runtime-cycle она не создаёт.
import type { ApiConfig, MwToolbox } from '@capsuletech/web-query';
import type { ICreateRouterOpts } from '@capsuletech/web-router';
// `intl?:` — import типов + runtime-функций из web-intl (headless singleton, нет
// runtime-cycle; пакет в dependencies, поэтому статический import безопасен).
import type { Dictionary, Locale, Tenant } from '@capsuletech/web-intl';
import {
  registerCopy,
  registerTenantCopy,
  setDefaultLocale,
  setLocale,
  setTenant,
} from '@capsuletech/web-intl';

/**
 * Конфиг приложения — то, что разработчик пишет в `apps/<app>/capsule.app.ts`.
 */
export interface IAppConfig {
  meta?: {
    /** Список валидных тегов. Превращается в `CapsuleTags` (автокомплит). */
    tags?: readonly string[];
  };
  /** Алиасы тегов. Ключи попадают в `CapsuleAliases` (whitelist `@`-литералов). */
  aliases?: Record<string, readonly string[]>;
  /**
   * API-конфиг — фабрика `({ mw }) => ApiConfig`. Получает toolbox встроенных
   * middleware (`cookies`, `auth`, `statusMapper`, `on401`, `log`, `retry`).
   * Реальная сборка — в bootstrap'е через `createApi(config.api, endpoints)`.
   */
  api?: (ctx: { mw: MwToolbox }) => ApiConfig;
  /**
   * Опциональные пакеты, которые будут зарегистрированы как глобалы.
   *
   * Каждый элемент — либо строка (имя npm-пакета), либо объект `{ use, as }`.
   *
   * Строка: пакет самоназывается через свой `/capsule` манифест (`defaultName`).
   * Например, `'@capsuletech/web-map'` → манифест объявляет `name: 'Maps'` →
   * глобал `Maps.*` с `Maps.View`, `Maps.Layer` и т.д.
   *
   * Объект `{ use, as }`: явный override имени глобала. Нужен для разрешения
   * коллизий с JS-built-in именами (Map/Set/Date/Promise) или для вкусовщины.
   * Например, `{ use: '@capsuletech/web-renderer', as: 'Render' }` → глобал `Render.*`.
   *
   * Обрабатывается `CapsuleRegistryPlugin` (owner-builders, фаза 3 ADR 033):
   * резолвит манифест через jiti, генерит `.capsule/registry/packages.ts`
   * и `.capsule/@types/packages.d.ts`.
   *
   * @see ADR 033 — Механизм регистрации опциональных пакетов
   */
  packages?: ReadonlyArray<string | { use: string; as?: string }>;
  /**
   * Настройки интернационализации (i18n). Применяются в bootstrap'е до рендера
   * через `applyIntlConfig(config.intl)`. Синглтоны `@capsuletech/web-intl`
   * module-level — JSX-провайдер не обязателен.
   *
   * Precedence locale/tenant: persisted `localStorage` значение ('capsule-locale' /
   * 'capsule-tenant') побеждает над конфигом — явный пользовательский выбор
   * переживает перезагрузку (тот же порядок, что в `IntlProvider`).
   */
  intl?: {
    /** Fallback-локаль: используется когда активная локаль не содержит ключ. */
    defaultLocale?: Locale;
    /** Активная локаль при старте (если нет persisted 'capsule-locale'). */
    locale?: Locale;
    /** Базовые словари, индексированные по локали. */
    dictionaries?: Partial<Record<Locale, Dictionary>>;
    /**
     * Per-tenant переопределения: `tenant → locale → Dictionary`.
     * Переопределяйте только ключи, которые отличаются от базовых.
     */
    tenants?: Partial<Record<Tenant, Partial<Record<Locale, Dictionary>>>>;
    /** Активный tenant при старте (если нет persisted 'capsule-tenant'). */
    tenant?: Tenant;
  };
  /**
   * Настройки роутера приложения.
   */
  router?: {
    /**
     * Путь редиректа при notFound (нет совпавшего маршрута и нет собственного
     * notFoundComponent на route). Резолвится относительно basepath.
     * Дефолт — '/' (задаётся в BaseProviders).
     */
    notFoundRedirect?: string;
    /**
     * Глобальный guard на root-route. Получает TanStack beforeLoad-контекст
     * (location/params/search/context/cause). Может быть async, бросать
     * redirect()/notFound() из @capsuletech/web-router.
     * Роутер не знает про auth — вся политика тут.
     */
    beforeLoad?: ICreateRouterOpts['beforeLoad'];
  };
}

/**
 * Identity-функция для `capsule.app.ts`. Используется для type inference.
 * AppConfigPlugin transform replace'нет вызов в browser bundle.
 */
export const defineAppConfig = <T extends IAppConfig>(config: T): T => config;

/**
 * Применяет `IAppConfig.intl` к синглтонам `@capsuletech/web-intl`.
 *
 * Вызывается в сгенерированном bootstrap'е (`app-config.gen.ts`) до рендера,
 * аналогично тому как `createApi` применяется для `config.api`. JSX-провайдер
 * не нужен — функции web-intl работают на module-level сигналах.
 *
 * Precedence (localStorage побеждает над конфигом):
 *  - locale: `localStorage.getItem('capsule-locale')` → используем его, иначе `intl.locale`
 *  - tenant: `localStorage.getItem('capsule-tenant')` → используем его, иначе `intl.tenant`
 *
 * @param intl — секция `config.intl` из `IAppConfig`. Если `undefined` — no-op.
 */
export const applyIntlConfig = (intl: IAppConfig['intl']): void => {
  if (!intl) return;

  for (const [loc, dict] of Object.entries(intl.dictionaries ?? {})) {
    if (dict) registerCopy(loc, dict);
  }

  for (const [ten, byLocale] of Object.entries(intl.tenants ?? {})) {
    for (const [loc, dict] of Object.entries(byLocale ?? {})) {
      if (dict) registerTenantCopy(ten, loc, dict);
    }
  }

  if (intl.defaultLocale) setDefaultLocale(intl.defaultLocale);

  const persistedLocale =
    typeof window !== 'undefined' && localStorage.getItem('capsule-locale');
  if (intl.locale && !persistedLocale) setLocale(intl.locale);

  const persistedTenant =
    typeof window !== 'undefined' && localStorage.getItem('capsule-tenant');
  if (intl.tenant && !persistedTenant) setTenant(intl.tenant);
};

