/**
 * Catalog — единственный источник правды о списке задеплоенных приложений
 * и текущем выбранном приложении в testing-hub.
 *
 * State machine:
 *   idle → loading → loaded
 *                 ↘ error
 *
 * `idle.onInit` немедленно переводит в `loading`, где происходит
 * API-вызов `api.apps.list({})`. Успех → `loaded`, ошибка → `error`.
 *
 * Выбор приложения — через top-level `onClick` (работает в любом стейте).
 * Виджет кладёт в `target.meta.tags` тег `'app-select'` и в `target.payload`
 * объект `{ name: string }`. Роутер находит запись в `list` по `name`
 * и кладёт готовый объект в `selected`. Виджеты (sidebar + iframe) читают
 * `store.ctx.data.selected` и НЕ знают про поиск по имени.
 *
 * Context shape (доступ через `store.ctx.data.X`):
 * ```ts
 * {
 *   list:     IApp[];       // загруженный список приложений
 *   selected: IApp | null;  // выбранное приложение
 *   error:    string | null; // последнее сообщение об ошибке
 * }
 * ```
 */

import type { z } from 'zod';

export type IApp = z.infer<typeof Entities.App.schema>;

/** Shape пользовательского контекста Features.Catalog — читать через `store.ctx.data`. */
export interface ICatalogContext {
  list: IApp[];
  selected: IApp | null;
  error: string | null;
}

const Catalog = Feature(({ api }) => ({
  initial: 'idle' as const,

  context: {
    list: [] as IApp[],
    selected: null as IApp | null,
    error: null as string | null,
  },

  /**
   * onClick — top-level роутер кликов (fallback в любом стейте).
   *
   * Тег `'app-select'` + payload `{ name }` → находит приложение в `list`
   * и записывает в `selected`. Идемпотентен: повторный клик по уже
   * выбранному приложению игнорируется.
   */
  onClick: ({ target, store }) => {
    const tags = (target as { meta?: { tags?: string[] } }).meta?.tags ?? [];

    if (tags.includes('app-select')) {
      const name = (target as { payload?: { name?: string } }).payload?.name;
      if (!name || store.ctx.data.selected?.name === name) return;
      const item = store.ctx.data.list.find((a: IApp) => a.name === name);
      store.update({ selected: item ?? null });
    }
  },

  states: {
    /**
     * idle — стартовое состояние. onInit немедленно переходит в `loading`,
     * не делая API-вызов самостоятельно (разделение ответственности).
     */
    idle: {
      onInit: ({ state }) => {
        state.set('loading');
      },
    },

    /**
     * loading — единственный стейт с API-вызовом.
     * Валидирует ответ через `Entities.App.schema.array().parse(...)`.
     * На success → `loaded`, на ошибку → `error`.
     */
    loading: {
      onInit: async ({ store, state }) => {
        if (!api) {
          store.update({ error: 'API client not initialized' });
          state.set('error');
          return;
        }

        store.setLoading(true);
        try {
          const result = await api.apps.list({});
          const list = Entities.App.schema.array().parse(result) as IApp[];
          store.update({ list, error: null });
          state.set('loaded');
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          store.update({ error: message });
          state.set('error');
        } finally {
          store.setLoading(false);
        }
      },
    },

    /** loaded — данные загружены, выбор через top-level onClick. */
    loaded: {},

    /** error — загрузка не удалась; `context.data.error` содержит сообщение. */
    error: {},
  },
}));

export default Catalog;
