/**
 * Auth feature — FSM idle → submitting → idle.
 *
 * Flow:
 *   idle.onClick (tag 'submit') → state.set('submitting')
 *   submitting.onInit → store.patch для loader/disable → api.auth.login → cleanup → state.set('idle')
 *
 * Читает props.mode ('login' | 'register') чтобы выбрать нужный endpoint.
 * store.values(['@input']) собирает login/password по alias-зонтику.
 */
const Auth = Feature(({ api, router }) => ({
  initial: 'idle',

  states: {
    idle: {
      onClick: ({ target, state }) => {
        const tags = (target.meta?.tags ?? []) as readonly string[];
        if (tags.includes('submit')) state.set('submitting');
      },
    },

    submitting: {
      onInit: async ({ store, state, context }) => {
        if (!api) {
          // eslint-disable-next-line no-console
          console.error('[auth] api client not initialized — check capsule.app.ts > api');
          state.set('idle');
          return;
        }

        store.patch(['@submit'], { loading: true });
        store.patch(['@input'], { disabled: true });

        const values = store.values(['@input']) as { login?: string; password?: string };
        const mode = (context as { props?: { mode?: string } }).props?.mode ?? 'login';

        try {
          let token: string;
          if (mode === 'register') {
            const result = await api.auth.register({
              login: values.login ?? '',
              password: values.password ?? '',
            });
            token = result.token;
          } else {
            const result = await api.auth.login({
              login: values.login ?? '',
              password: values.password ?? '',
            });
            token = result.token;
          }
          // eslint-disable-next-line no-console
          console.log('[auth] ok:', token);
          localStorage.setItem('capsule-auth-token', token);
          router.goTo('/workspace');
        } catch (err) {
          // eslint-disable-next-line no-console
          console.error('[auth] failed:', err);
          store.update({ error: err instanceof Error ? err.message : 'Unknown error' });
        } finally {
          store.patch(['@submit'], { loading: false });
          store.patch(['@input'], { disabled: false });
          state.set('idle');
        }
      },
    },
  },
}));

export default Auth;
