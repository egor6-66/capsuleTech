export default defineAppConfig({
  meta: { tags: ['click', 'input', 'submit', 'login', 'password'] },
  aliases: {
    '@input': ['input'],
    '@submit': ['submit'],
  },
  packages: ['@capsuletech/web-shell', '@capsuletech/web-table'],
  api: () => ({
    bases: { default: '/api' },
  }),
  intl: {
    defaultLocale: 'ru',
    dictionaries: {
      ru: { 'app.title': 'EWC' },
      en: { 'app.title': 'EWC' },
    },
  },
});
