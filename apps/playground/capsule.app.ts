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
});
