export default defineAppConfig({
  meta: { tags: ['click'] },
  aliases: {},
  api: () => ({
    bases: { default: '/api' },
  }),
});
