const Navigation = Controller(({ router }) => ({
  initial: 'idle',
  /**
   * Подсвечивает active nav-item по текущему URL. `payload.href` (декларируется
   * Entity-автором через JSX-prop `payload={{href}}`) — источник истины про то
   * куда указывает таб; `meta.tags` — только идентификация (роль `nav`).
   */
  onRegister: ({ store }) =>
    store.patch(['nav'], (comp) => ({
      active: comp.payload?.href === router.current(),
    })),
  states: {
    idle: {
      onClick: async ({ target, next, store }) => {
        const tags = target.meta?.tags;

        if (tags?.includes('logout')) {
          await next();
          return;
        }

        if (tags?.includes('nav')) {
          const href = (target.payload as { href?: string } | undefined)?.href;
          if (href) {
            router.goTo(href);
            store.patch(['nav'], (comp) => ({
              active: comp.payload?.href === href,
            }));
          }
        }
      },
    },
  },
}));

export default Navigation;
