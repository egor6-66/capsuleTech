/**
 * Boot feature — entry redirect for `/`.
 *
 * Desktop (Tauri) loads the app at the root URL `/`; there is no content page
 * there. On mount this routes to `/workspace` when an auth token is present
 * (returning user), otherwise to `/login`. The redirect fires in `onInit`
 * (runs once on mount — see logic-wrapper lifecycle), so `/` is never shown.
 *
 * Boot lives in the `_public` layout (which also wraps /login, /register), so
 * the `current() === '/'` guard ensures it redirects ONLY from the bare entry —
 * otherwise it would bounce /login → /login on every visit.
 */
const Boot = Feature(({ router }) => ({
  initial: 'idle',

  states: {
    idle: {
      onInit: () => {
        if (router.current() !== '/') return;
        const token = localStorage.getItem('capsule-auth-token');
        router.goTo(token ? '/workspace' : '/login');
      },
    },
  },
}));

export default Boot;
