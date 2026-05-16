export default defineAppConfig({
  meta: {
    tags: ['email', 'password', 'submit', 'nav', 'logout'],
  },
  aliases: {
    '@login-form': ['email', 'submit'],
    '@header': ['nav', 'logout'],
  },
  api: ({ mw }) => ({
    bases: { default: '/api' },
    defaultHeaders: { Accept: 'application/json' },
    defaultStaleTime: 30_000,
    middleware: [
      mw.cookies(),
      mw.statusMapper(),
      mw.on401(() => {
        // В реальном проекте — `routerService.goTo('/_auth')`.
        console.warn('[api] 401 → redirect to /_auth');
      }),
      mw.log(),
    ],
  }),
});
