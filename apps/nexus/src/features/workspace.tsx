/**
 * Workspace feature — обрабатывает click'и в workspace shell'е.
 *
 * Сейчас:
 *   - tag 'logout' → clear token + redirect /login.
 */
const Workspace = Feature(({ router }) => ({
  initial: 'idle',

  states: {
    idle: {
      onClick: ({ target }) => {
        const tags = (target.meta?.tags ?? []) as readonly string[];
        if (tags.includes('logout')) {
          localStorage.removeItem('capsule-auth-token');
          router.goTo('/login');
        }
      },
    },
  },
}));

export default Workspace;
