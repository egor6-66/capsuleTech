/**
 * App — корневой оркестратор приложения (root feature).
 *
 * Монтируется RouterPlugin'ом в `__root` ВЫШЕ `<Outlet/>` → живёт один раз на
 * всё приложение, переживает все навигации (mount-once persist), держит вьювера.
 *
 * Ловит ИМЕНОВАННЫЕ события пакета авторизации (ADR 032, top-level → payload типизирован
 * через `Auth.Login.Events`):
 *   onLogin — Auth.Login сообщил об успешном входе → сохраняем вьювера, → authed.
 *   onError — ошибка входа → лог (позже toast).
 *
 * Logout — клик с тегом 'logout' на authed-странице → чистим вьювера → guest.
 *
 * Роутинг — через lifecycle `onInit` стейтов (guard):
 *   guest.onInit  → /login            (гость не видит приватные роуты)
 *   authed.onInit → /workspace/home   (после входа — в shell-воркспейс)
 *
 * Контекст (user-данные в context.data, read через `useCtx().store.ctx.data.X`):
 *   viewer: { role } | null — текущий вьювер; null = гость.
 */

type AppCtx = { viewer: { role: string } | null };

const App = Feature<Auth.Login.Events, AppCtx>(({ router, utils }) => ({
  initial: 'guest',

  context: {
    viewer: null,
  },

  states: {
    guest: {
      onInit: () => {
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
        router.goTo('/workspace/home');
      },
      onClick: ({ target, store, state }) => {
        if (utils.includes(target.meta?.tags ?? [], 'logout')) {
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
