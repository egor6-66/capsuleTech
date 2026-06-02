export default defineAppConfig({
  meta: { tags: ['click'] },
  api: () => ({
    bases: { default: '/api' },
  }),
});
