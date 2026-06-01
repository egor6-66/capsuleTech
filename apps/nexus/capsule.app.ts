export default defineAppConfig({
  meta: { tags: ['click', 'input', 'submit', 'login', 'password', 'pick'] },
  aliases: {
    '@input': ['input'],
    '@submit': ['submit'],
  },
  api: () => ({
    bases: { default: '/api' },
  }),
});
