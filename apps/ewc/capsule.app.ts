export default defineAppConfig({
  meta: { tags: ['click', 'input', 'submit', 'login', 'password'] },
  aliases: {
    '@input': ['input'],
    '@submit': ['submit'],
  },
  packages: ['@capsuletech/web-shell'],
  api: () => ({
    bases: { default: '/api' },
  }),
});
