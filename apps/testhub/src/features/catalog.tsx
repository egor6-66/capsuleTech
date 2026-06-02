/**
 * Catalog feature — загружает каталог задеплоенных апп и управляет выбором.
 *
 * Store contract (читается через `ctx.store.ctx.data`):
 *   apps     — список загруженных приложений (z.array(Entities.App.schema))
 *   selected — выбранная запись или null
 *   loading  — true пока идёт загрузка
 *
 * Flow:
 *   idle.onInit  → state.set('loading')
 *   loading.onInit → api.apps.list() → store.update({ apps }) → state.set('idle')
 *   idle.onClick  → tag 'select-app' → store.update({ selected }) → остаётся idle
 */
const Catalog = Feature(({ api }) => ({
  initial: 'loading',

  context: {
    apps: [] as Array<{ app: string; base: string; url: string; deployedAt: string | null }>,
    selected: null as { app: string; base: string; url: string; deployedAt: string | null } | null,
    loading: true,
  },

  states: {
    loading: {
      onInit: async ({ store, state }) => {
        if (!api) {
          store.update({ loading: false });
          state.set('idle');
          return;
        }

        try {
          const apps = await api.apps.list({});
          store.update({ apps, loading: false });
        } catch {
          store.update({ loading: false });
        }

        state.set('idle');
      },
    },

    idle: {
      onClick: ({ target, store }) => {
        const tags = (target.meta?.tags ?? []) as readonly string[];
        if (!tags.includes('select-app')) return;

        // Имя приложения передаётся как тег вида 'app:<name>'
        const appTag = tags.find((t) => t.startsWith('app:'));
        if (!appTag) return;

        const appName = appTag.slice('app:'.length);
        const ctx = store.ctx as {
          data: {
            apps: Array<{ app: string; base: string; url: string; deployedAt: string | null }>;
          };
        };
        const found = ctx.data.apps.find((a) => a.app === appName) ?? null;
        store.update({ selected: found });
      },
    },
  },
}));

export default Catalog;
