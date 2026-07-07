export default defineAppConfig({
  meta: {
    tags: ['click', 'input', 'submit', 'role', 'password', 'logout'],
  },
  aliases: {
    '@input': ['input'],
    '@submit': ['submit'],
  },
  packages: [
    '@capsuletech/web-auth',
    '@capsuletech/web-shell',
    '@capsuletech/boost-layout',
    '@capsuletech/web-studio',
  ],
  // remote-механика канваса теперь ВНУТРИ web-studio (WebStudio.Provider canvasUrl) —
  // апп больше не регистрирует web-remote / remotes напрямую.
  docs: {
    rootVault: false,
    packages: ['@capsuletech/web-ui'],
  },
  api: () => ({
    bases: { default: '/api' },
  }),
  router: {
    transition: true,
  },

  // Access gate-ось: policy «роль → права». Резолвер `can` инжектится client-side
  // генератором (app-config.gen → setupAccess) — пункты нав/элементы с `can`
  // режутся по роли (useAuth().role). Декларативно, БЕЗ импортов рантайма
  // (capsule.app.ts eval'ится build-time в node).
  access: {
    developer: ['*'],
    designer: ['studio'],
    devops: ['devops'],
  },

  // Auth: персист сессии в localStorage + синхронный rehydrate на загрузке
  // (генератор → configureAuthSession) → reload не теряет вход, нет токена → /login.
  auth: {
    session: { storage: 'local', key: 'studio-auth' },
  },
});
