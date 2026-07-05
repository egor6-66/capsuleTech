import type { AnyRoute, AnyRouter, ParsedLocation, RouterCore } from '@tanstack/router-core';

/**
 * Контекст, передаваемый в глобальный `beforeLoad`-хук (поле `ICreateRouterOpts.beforeLoad`).
 *
 * Является подмножеством `BeforeLoadContextOptions` TanStack для root-route
 * (без специфичных для конкретного маршрута полей `search` / `params` с жёсткой
 * типизацией — на root-level они всегда `{}`). Поля `navigate` и `buildLocation`
 * намеренно исключены: в `beforeLoad` правильный паттерн — `throw redirect(...)`,
 * а не `navigate(...)` (метод помечен deprecated в TanStack).
 *
 * Почему не переиспользуем `BeforeLoadContextOptions<...>` напрямую: он имеет
 * 9 generic-параметров, связанных с конкретным route-деревом. Для root-guard'а
 * большинство из них тривиальны (`{}` / `any`). Inline-тип + `ParsedLocation` из
 * `@tanstack/router-core` (уже type-only импорт) даёт разработчику
 * автокомплит по `ctx.location.pathname`, `ctx.cause`, `ctx.params`, `ctx.context`
 * без раскрытия глубокой generic-стека TanStack.
 *
 * При смене движка этот интерфейс — единственная точка адаптации.
 */
export interface IBeforeLoadContext {
  /** Разобранный URL текущей навигации (pathname, search, hash, href и т.д.). */
  location: ParsedLocation;
  /** Причина навигации: первый вход, переход, preload. */
  cause: 'preload' | 'enter' | 'stay';
  /** Path-параметры root-маршрута (всегда `{}` для root-route). */
  params: Record<string, unknown>;
  /** Поисковые параметры root-маршрута (всегда `{}` для root-route). */
  search: Record<string, unknown>;
  /** Роутерный context (пробрасывается из `createRouter({ context })`). */
  context: Record<string, unknown>;
  /** `true` если вызов — preload (не реальная навигация). */
  preload: boolean;
  /** AbortController текущей навигации. */
  abortController: AbortController;
}

/**
 * Initial-context роутера — пробрасывается в каждый TanStack-route как
 * `match.context`. Используется guard'ами (`beforeLoad`, `loader`).
 *
 * Generic `TUser` — application-specific shape (`{ isAuthenticated, tenant, ... }`).
 * Default `{}` — пустой context. Index signature `[k: string]: unknown` — это
 * backwards-compat предохранитель: TanStack пробрасывает context в guard'ы как
 * loose record, и без index signature TS ругается на «лишние» поля при
 * расширении на стороне app.
 *
 * См. [[014-router-api-extension|ADR 014]] — generic вместо зашитого
 * `isAuthenticated?: boolean`.
 */
// biome-ignore lint/complexity/noBannedTypes: empty-object default for structural intersection — `Record<string, never>` would forbid the `[k]: unknown` index signature below, breaking TanStack guard typing.
export type ICapsuleRouterContext<TUser extends object = {}> = TUser & {
  [k: string]: unknown;
};

/**
 * Опции навигации для `ICapsuleRouter.goTo`. Прямо мапятся в `raw.navigate({...})`
 * TanStack. См. [[014-router-api-extension|ADR 014]] — переход от
 * 2-аргументного `goTo(path, params)` к options-объекту.
 */
export interface IGoToOpts {
  /** Path-параметры маршрута (`:id` → `{ id: '...' }`). */
  params?: Record<string, unknown>;
  /** Query-параметры (`?tag=urgent&sort=date`). */
  search?: Record<string, unknown>;
  /** Anchor (`#section-1`). Без ведущего `#`. */
  hash?: string;
  /** `history.replaceState` вместо `pushState`. */
  replace?: boolean;
}

/**
 * Публичный API роутера, который инжектится в Controller/Feature через `services.router`.
 * Скрывает детали TanStack — если когда-то поменяем движок, signature останется.
 *
 * Generic `TRouteTree` пробрасывается в `raw` для типизированного escape-hatch'а
 * (`raw.navigate({...})` с autocomplete-маршрутами). По умолчанию — `AnyRoute`,
 * что эквивалентно прежнему `AnyRouter` контракту.
 */
export interface ICapsuleRouter<TRouteTree extends AnyRoute = AnyRoute> {
  goTo(path: string, opts?: IGoToOpts): void;
  back(): void;
  current(): string;
  /**
   * Реактивный доступ к path-параметрам текущего маршрута.
   *
   * Возвращает **все** path-параметры leaf-матча. TanStack мёржит параметры
   * маршрутов-предков в каждый вложенный матч, поэтому для deep-link роута
   * (`/lessons/rules/$ruleId` внутри layout `/lessons`) leaf уже содержит полный
   * набор (`{ ruleId }`). Если ни один маршрут не совпал — `{}`.
   *
   * Реактивен так же, как `current()`: читает `raw.state` (Solid-memo TanStack),
   * поэтому при навигации `/rules/a → /rules/b` внутри Solid-реактивного scope
   * (JSX-проп, `createMemo`, `createEffect`) отдаёт новое значение БЕЗ ремаунта.
   * Не кэшировать в `const` вне реактивного контекста.
   *
   * Симметрия на чтение к `IGoToOpts.params` (запись через `goTo`).
   *
   * ```tsx
   * // pages/_workspace/lessons/rules/[ruleId].tsx → /lessons/rules/$ruleId
   * const router = useRouter();
   * return <Learn.Lessons.Rule id={router.params().ruleId} />;
   * ```
   */
  params(): Record<string, string>;
  /**
   * Сахар над `params()` для одного ключа: `param('ruleId')` ≡
   * `params().ruleId`. Возвращает `undefined`, если ключа нет в текущем матче.
   * Реактивен на тех же условиях, что `params()`.
   */
  param(name: string): string | undefined;
  /** Escape hatch для случаев, когда нужны API-возможности TanStack напрямую. */
  raw: RouterCore<TRouteTree, any, any, any, any>;
}

/**
 * Опции фабрики. `routeTree` обязателен, generic выводится из него; `context` —
 * initial-context роутера для guards; `basepath` — URL-префикс приложения
 * (для раздачи под под-путём, например `/ewc`).
 */
export interface ICreateRouterOpts<TRouteTree extends AnyRoute = AnyRoute> {
  routeTree: TRouteTree;
  context?: ICapsuleRouterContext;
  /**
   * URL-базовый путь приложения (под-путь раздачи).
   * Обычно из `import.meta.env.BASE_URL`.
   *
   * Trailing slash нормализуется автоматически: `/ewc/` → `/ewc`.
   * Значения `undefined`, `''`, `'/'` трактуются как «корень» — basepath не задаётся.
   *
   * Пример: `basepath: '/ewc'` при браузерном URL `/ewc/dashboard`
   * → TanStack видит маршрут `/dashboard`, `current()` возвращает `/dashboard`.
   */
  basepath?: string;
  /**
   * URL-путь, на который редиректить при отсутствии совпавшего маршрута,
   * если ни один route не задал собственный `notFoundComponent`.
   * Резолвится относительно `basepath`.
   *
   * `undefined` — редиректа нет: TanStack отрисует дефолтный экран «Not Found».
   *
   * Если конкретный route или rootRoute задаёт `notFoundComponent` —
   * он имеет приоритет; этот редирект работает только как фреймворковый дефолт
   * через `defaultNotFoundComponent`.
   *
   * Пример: `notFoundRedirect: '/dashboard'` — любой 404 → replace-навигация
   * на `/dashboard`, без записи в history.
   */
  notFoundRedirect?: string;
  /**
   * Включает нативный браузерный View Transitions API для всех навигаций
   * (TanStack `defaultViewTransition`). Кроссфейд старого/нового DOM делается
   * браузером; внешний вид настраивается глобальным CSS `::view-transition-old/new(...)`
   * (в @capsuletech/web-style). Дефолт — выключено (undefined/false).
   * Грейсфул-деградация: в браузерах без поддержки API навигация просто без анимации.
   */
  viewTransition?: boolean;
  /**
   * Глобальный guard, вызываемый TanStack **перед** рендером любого маршрута.
   * Исполняется на root-route — охватывает **все** навигации в приложении.
   *
   * Используй для: auth-редиректов, проверки ролей, maintenance-режима,
   * feature-flags — всего, что должно отработать до загрузки страницы.
   *
   * Рекомендуемый паттерн:
   * ```ts
   * import { redirect } from '@capsuletech/web-router';
   *
   * beforeLoad: ({ location }) => {
   *   const authed = !!localStorage.getItem('capsule-auth-token');
   *   if (location.pathname.startsWith('/workspace') && !authed) {
   *     throw redirect({ to: '/login', search: { redirect: location.href } });
   *   }
   * }
   * ```
   *
   * - Может быть sync или async.
   * - Должен бросать `redirect(...)` или `notFound()` (из `@capsuletech/web-router`)
   *   для прерывания навигации. Возврат `void` — навигация продолжается.
   * - Вызывается при КАЖДОЙ навигации (включая preload) — колбэк должен быть дешёвым.
   * - Если `routeTree` уже содержит `beforeLoad` — этот колбэк **перезапишет** его.
   *   Для составной логики объедини в одной функции.
   *
   * Тип контекста — `IBeforeLoadContext`. Поле `context` содержит значение,
   * переданное в `createRouter({ context })`.
   *
   * См. [[030-router-notfound-and-beforeload|ADR 030]].
   */
  beforeLoad?: (ctx: IBeforeLoadContext) => void | Promise<void>;
}

/**
 * Нормализует `basepath` для передачи в TanStack `createRouter`.
 *
 * Правила:
 * - Убирает trailing slash: `/ewc/` → `/ewc`.
 * - Если результат пустой, `'/'` или falsy — возвращает `undefined`
 *   (TanStack по умолчанию работает с корневым путём, без явного basepath).
 *
 * Экспортируется для unit-тестирования как чистая функция (node-env, без jsdom).
 */
export const normalizeBase = (b?: string): string | undefined => {
  if (!b) return undefined;
  const t = b.replace(/\/+$/, '');
  return t === '' || t === '/' ? undefined : t;
};

/**
 * Пакетная обёртка над сырым TanStack-роутером. Вынесена отдельно от `createRouter`,
 * чтобы её можно было тестировать без value-импорта `@tanstack/solid-router`
 * (тот тянет клиентские Solid-API и падает в node-env). Принимает любой
 * `AnyRouter` — generic'и выведутся в публичной фабрике.
 */
export const wrap = <TRouteTree extends AnyRoute = AnyRoute>(
  raw: AnyRouter,
): ICapsuleRouter<TRouteTree> => ({
  raw: raw as RouterCore<TRouteTree, any, any, any, any>,
  goTo: (path, opts) => {
    raw.navigate({ to: path, ...opts } as never);
  },
  back: () => {
    raw.history.back();
  },
  current: () => raw.state.location.pathname,
  // Leaf-матч несёт полный набор path-параметров (TanStack мёржит предков).
  // Читаем `raw.state` тем же паттерном, что `current()` — Solid-memo TanStack
  // делает доступ реактивным внутри реактивного scope. Нет матча → `{}`.
  params: () => {
    const { matches } = raw.state;
    return (matches[matches.length - 1]?.params ?? {}) as Record<string, string>;
  },
  param: (name) => {
    const { matches } = raw.state;
    return (matches[matches.length - 1]?.params as Record<string, string> | undefined)?.[name];
  },
});
