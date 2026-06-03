---
tags: [hca, adr, accepted]
status: accepted
date: 2026-06-03
---

# ADR 030 — Router: декларативный `notFoundRedirect` + generic `beforeLoad`-хук

> [!note] Статус
> `notFoundRedirect` — **реализовано** (web-router + web-core + builders, ветка `develop`). Generic `beforeLoad` — **принято, в работе** (та же проводка).

## Контекст

С момента [[003-router-context-based|ADR 003]] / [[014-router-api-extension|ADR 014]] capsule-роутер — тонкая обёртка над TanStack, создаваемая в `createRouter` (web-router) из `BaseProviders` (web-core), куда конфиг течёт из `apps/<app>/capsule.app.ts` через сгенерированный bootstrap (builders).

Две дырки в поведении при навигации:

1. **Несовпавший маршрут показывает дефолтный TanStack «Not Found».** Нет способа из приложения сказать «битая ссылка → веди на такой-то путь». Раньше — только руками в роутах, которых нет (генерятся).
2. **Нет места для guard'ов.** Сгенерированный роут умеет только `component` — некуда воткнуть «перед показом приватной страницы проверь авторизацию». Auth-редирект пытались навесить на `on401`-middleware (web-query), но handler там живёт вне компонентов и не достаёт Context-based роутер (ADR 003 убрал синглтон) — чистой навигации оттуда нет, только `window.location` (костыль) или возврат синглтона (разворот ADR 003).

Оба — про один seam: поведение роутера при входе на маршрут, конфигурируемое из приложения.

## Решение

### 1. `notFoundRedirect` (реализовано)

`ICreateRouterOpts.notFoundRedirect?: string`. Если задан — `createRouter` ставит TanStack `defaultNotFoundComponent`, который делает `<Navigate to={notFoundRedirect} replace />`. Если route/rootRoute задаёт собственный `notFoundComponent` — он в приоритете (наш — только дефолт).

Дефолт `'/'` живёт в `BaseProviders` (`props.notFoundRedirect ?? '/'`). Конфиг — `IAppConfig.router.notFoundRedirect`.

### 2. Generic `beforeLoad`-хук (новое)

Вместо зашивания доменного `auth` в роутер — **generic-колбэк**, которому отдаётся весь TanStack root-`beforeLoad`-контекст. Приложение само решает любой кейс (auth, roles, maintenance, feature-flags):

```ts
// apps/<app>/capsule.app.ts
import { redirect } from '@capsuletech/web-router';

export default defineAppConfig({
  router: {
    notFoundRedirect: '/workspace',
    beforeLoad: ({ location }) => {
      const authed = !!localStorage.getItem('capsule-auth-token');
      if (location.pathname.startsWith('/workspace') && !authed) {
        throw redirect({ to: '/login', search: { redirect: location.href } });
      }
    },
  },
});
```

Контракт:

- `IAppConfig.router.beforeLoad?` — тип = сигнатура root-route `beforeLoad` TanStack (`{ location, params, search, context, cause, ... }`). Может быть async, может `throw redirect(...)` / `throw notFound()` / вернуть void.
- `createRouter` принимает `beforeLoad` и вешает его на **root-роут** (глобальный guard). Способ привязки — на усмотрение owner-web-router: `rootRoute.update({ beforeLoad })` внутри `createRouter` (проводка остаётся чистой опцией) либо генерация через `__root`. На контракт не влияет.
- web-router **ре-экспортит `redirect` (и `notFound`)** из `@tanstack/solid-router`, чтобы приложение не импортило движок напрямую — абстракция web-router сохранна.
- Проброс — `bootstrap` отдаёт `appConfig.router?.beforeLoad` в `BaseProviders` → `createRouter` (та же цепочка, что `notFoundRedirect`).

### Полная цепочка (то, ради чего)

`/ewc/abc` (нет страницы) → `notFoundRedirect` → `/workspace` → root `beforeLoad`: «`/workspace` защищён + не авторизован» → `throw redirect('/login?redirect=…')`. После логина — назад по `search.redirect`.

Всё на router-уровне TanStack (`beforeLoad` + `redirect()`): срабатывает ДО рендера, чистая SPA-навигация. Проблема «middleware не достаёт роутер» исчезает — здесь роутер не нужен.

## Альтернативы

### A. Зашить `auth: { isAuthenticated, loginPath, protect }` в роутер
Декларативно и коротко для apps. Минус: доменный концепт (auth) протекает в инфраструктурный слой; любой не-auth кейс (maintenance, roles, feature-flags) туда не ложится → пришлось бы плодить поля. Отвергнуто в пользу generic `beforeLoad` (роутер немой, власть в логике приложения — дух HCA). Декларативный сахар поверх `beforeLoad` можно добавить позже отдельно.

### B. `on401`-middleware (web-query) для редиректа на логин
Handler живёт вне компонентов, Context-based роутер недостижим → `window.location` (полный релоад, костыль) или возврат синглтона (разворот ADR 003). Отвергнуто. `beforeLoad`+`redirect()` решает чисто.

### C. Per-page guard (именованный экспорт со страницы, чтение в RouterPlugin)
Гранулярнее (guard на конкретную страницу). Минус: больше работы в RouterPlugin, новый слой конвенций. Отложено — `beforeLoad` по `location.pathname` покрывает 90% (префиксы защищённых зон). Per-page можно добавить позже поверх.

## Последствия

### Положительные
- Битые ссылки ведут куда надо, а не в дефолтный «Not Found».
- Guard'ы любого рода — одно место (`capsule.app.ts`), полный TanStack-контекст, штатный `redirect()`. Роутер не знает про auth.
- Проводка переиспользует уже построенную цепочку `notFoundRedirect`.

### Отрицательные
- `IAppConfig.router` растёт — каждое новое поле теперь требует ADR (как `IGoToOpts`).
- Ре-экспорт `redirect`/`notFound` фиксирует часть TanStack-поверхности в публичном API web-router (при смене движка — адаптировать).
- `beforeLoad` на root бьёт по ВСЕМ навигациям — приложение отвечает за дешевизну предиката (sync-проверка storage ок; тяжёлый async потребует лоадер-плейсхолдера).

## Связанное

- [[003-router-context-based|ADR 003]] — Context-based роутер
- [[014-router-api-extension|ADR 014]] — расширение router-API
- [[013-explicit-define-app-config|ADR 013]] — `defineAppConfig`
- [[web-router]] — AI-anchor
