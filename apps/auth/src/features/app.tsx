/**
 * App — root feature auth-аппа (ADR 068 D7: standalone + redirect-флоу `?next=`).
 *
 * RouterPlugin монтирует `src/features/app.tsx` в `__root` выше `<Outlet/>`
 * (mount-once) → живёт один раз на всё приложение.
 *
 * Флоу:
 *   guest  — форма входа/регистрации (Widgets.Gate → Auth.Login / Auth.Register);
 *            переключение форм — теги to-register/to-login.
 *   authed — панель «вы вошли как <login>» + logout + «продолжить» по next.
 *
 * Именованные события пакета web-auth (ADR 032, агрегат `Auth.Events`):
 *   onLogin { user }        — успешный вход/регистрация: с валидным `?next=` —
 *                             полная навигация `window.location.assign(next)`
 *                             (другой апп = другой SPA, НЕ router.goTo);
 *                             без next — authed-состояние.
 *   onLoginError { message } — лог (форма показывает ошибку сама, package-level).
 *
 * 🔒 Open-redirect guard: `next` принимается ТОЛЬКО как same-origin path —
 * начинается с `/`, НЕ с `//`, без `://` и `\` — иначе отбрасывается (fallback:
 * остаёмся на authed-панели без кнопки «продолжить»).
 *
 * Logout — `authApi.logoutServer()` (POST /auth/logout: ревокация httpOnly-куки +
 * сброс session-store + BroadcastChannel-синк, ADR 068 D4) → guest.
 *
 * Доступ к `window.location` — осознанный compliance-warn (native-js): Feature =
 * IO-слой, cross-app переход живёт вне SPA-роутера.
 */

/** Open-redirect guard: только same-origin path, иначе null. */
const sanitizeNext = (raw: string | null): string | null => {
  if (!raw) return null;
  if (!raw.startsWith('/')) return null;
  if (raw.startsWith('//')) return null;
  if (raw.includes('://') || raw.includes('\\')) return null;
  return raw;
};

const App = Feature<Auth.Events>(({ utils, authApi }) => {
  // ?next= читается один раз на mount root-фичи (база '/auth/' search не трогает).
  const nextTarget = sanitizeNext(new URLSearchParams(window.location.search).get('next'));

  return {
    initial: 'guest',

    context: {
      viewer: null as Entities.Viewer.Row | null,
      mode: 'login' as 'login' | 'register',
      next: nextTarget,
    },

    states: {
      guest: {
        // Restore: cookie-сессия уже поднята bootstrap'ом (`initAuthSession`,
        // GET /auth/me) → входим в authed без формы. Гость — штатно, остаёмся.
        onInit: ({ store, state }) => {
          if (authApi?.isAuthed()) {
            store.update({ viewer: authApi.user() });
            state.set('authed');
          }
        },

        // Переключение вход ↔ регистрация (теги на кнопках Views.SwitchMode).
        onClick: ({ target, store }) => {
          const tags = target.meta?.tags ?? [];
          if (utils.includes(tags, 'to-register')) store.update({ mode: 'register' });
          if (utils.includes(tags, 'to-login')) store.update({ mode: 'login' });
        },
      },

      authed: {
        onClick: async ({ target, store, state }) => {
          const tags = target.meta?.tags ?? [];
          if (utils.includes(tags, 'logout')) {
            await authApi?.logoutServer();
            store.update({ viewer: null, mode: 'login' });
            state.set('guest');
            return;
          }
          if (utils.includes(tags, 'continue') && nextTarget) {
            window.location.assign(nextTarget);
          }
        },
      },
    },

    // Успешный вход/регистрация (Auth.Login и Auth.Register оба эмитят onLogin).
    onLogin: ({ target, store, state }) => {
      if (nextTarget) {
        window.location.assign(nextTarget);
        return;
      }
      store.update({ viewer: target.payload?.user ?? null });
      state.set('authed');
    },

    onLoginError: ({ target }) => {
      console.warn('[auth-app] login failed:', target.payload?.message);
    },
  };
});

export default App;
