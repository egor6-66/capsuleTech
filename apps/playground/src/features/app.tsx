/**
 * App — корневой оркестратор приложения (root feature).
 *
 * Монтируется RouterPlugin'ом в `__root` ВЫШЕ `<Outlet/>` → живёт один раз на
 * всё приложение, переживает все навигации (mount-once persist), держит вьювера.
 *
 * Ловит ИМЕНОВАННЫЕ события домена авторизации (ADR 032; payload типизирован через
 * package-агрегат `Auth.Events` — все события пакета, не per-component):
 *   onLogin (в guest)      — успешный вход → сохраняем вьювера, → authed.
 *   onLoginError (в guest) — ошибка входа → лог (позже toast).
 *
 * Logout — клик с тегом 'logout' на authed-странице → `authApi.logout()` (инжектированный
 * action пакета чистит auth-сессию) + чистим вьювера → guest.
 *
 * Роутинг — через lifecycle `onInit` стейтов (guard):
 *   guest.onInit  → /login            (гость не видит приватные роуты)
 *   authed.onInit → /workspace/home   (после входа — в shell-воркспейс)
 *
 * Контекст (user-данные в context.data, read через `useCtx().store.ctx.data.X`):
 *   viewer: Entities.Viewer.Row | null — текущий вьювер; null = гость.
 *   Тип — глобал `Entities.Viewer.Row` (codegen $infer), без импорта.
 */

type AppCtx = { viewer: Entities.Viewer.Row | null };

const App = Feature<Auth.Events, AppCtx>(({ router, utils, authApi }) => ({
  initial: 'guest',

  context: {
    viewer: null,
  },

  states: {
    guest: {
      onInit: ({ store, state }) => {
        // Restore: rehydrated сессия (configureAuthSession в capsule.app.ts) синхронно
        // восстановлена из localStorage → входим в authed без формы. Нет токена → /login.
        if (authApi?.isAuthed()) {
          store.update({ viewer: authApi.user() });
          state.set('authed');
          return;
        }
        router.goTo('/login');
      },

      // Именованные события пакета авторизации (top-level → target.payload типизирован).
      onLogin: ({ target, store, state }) => {
        store.update({ viewer: target.payload?.user });
        state.set('authed');
      },
    },

    authed: {
      onInit: () => {
        router.goTo('/workspace');
      },
      onClick: ({ target, store, state }) => {
        if (utils.includes(target.meta?.tags ?? [], 'logout')) {
          // auth — инжектированный action пакета web-auth (services injection spike):
          // чистит auth-сессию пакета (defaultAuthSession), приходит первым аргументом.
          authApi?.logout();
          store.update({ viewer: null });
          state.set('guest');
        }
      },
    },
  },

  onLoginError: ({ target }) => {
    // eslint-disable-next-line no-console
    console.error('[app] login failed:', target.payload?.message);
  },
}));

export default App;
