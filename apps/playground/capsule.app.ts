import { configureAuthSession } from '@capsuletech/web-auth/session';
import { setupAccess } from '@capsuletech/web-access';

// Auth: персист сессии в localStorage + синхронный rehydrate на загрузке
// (useAuth().isAuthed/role восстанавливаются ДО первого рендера → reload не теряет вход).
configureAuthSession({ storage: 'local', key: 'playground-auth' });

// Access gate-ось: policy «роль → права». Резолвер `can` инжектится в web-core
// enforcement-sink → пункты нав/элементы с `can` режутся по роли (useAuth().role).
// Промоут → декларативный `access:` в defineAppConfig (генератор) — позже.
setupAccess({
  developer: ['*'],
  designer: ['styles', 'ui', 'words'],
  devops: ['devops'],
});

export default defineAppConfig({
  meta: {
    tags: ['click', 'input', 'submit', 'role', 'password', 'logout'],
  },
  aliases: {
    '@input': ['input'],
    '@submit': ['submit'],
  },
  packages: ['@capsuletech/web-auth', '@capsuletech/web-shell'],
  api: () => ({
    bases: { default: '/api' },
  }),
  router: {
    transition: true,
  },
});
