/**
 * Features.Library — тянет слова (senses) с backend/learn через services.api + поиск.
 *
 * onInit (loading) → api.learn.senses({}) → store.update({ senses }).
 * onInput (поиск) → читает значение search-input'а из стора (UiProxy авто-сохраняет
 *   value по meta-тегу) → api.learn.senses({ q }) → обновляет список.
 * Данные читаются во View через useCtx().store.ctx.data.senses.
 *
 * SKELETON: поиск по `q` (без debounce — на keystroke; дёшево на малом наборе).
 */
const Library = Feature(({ api }) => ({
  initial: 'loading',

  // На уровне страницы — кормит и сетку слов (Words), и инфо-панель (WordInfo).
  // Выбор TTS-движка — app-глобальный concern, живёт в Features.App (не тут).
  context: {
    senses: [] as unknown[],
    selectedId: null as number | null,
  },

  states: {
    loading: {
      onInit: async ({ store, state }) => {
        const res = await api.learn.senses({});
        store.update({ senses: res.senses });
        state.set('ready');
      },
    },
    ready: {},
  },

  // Поиск: input с meta-тегом 'search' → UiProxy кладёт value в стор → читаем + фильтруем.
  onInput: async ({ store }) => {
    const { search } = store.values(['search']) as Record<string, string>;
    const res = await api.learn.senses(search ? { q: search } : {});
    store.update({ senses: res.senses });
  },

  // Клик: speak (🔊 — баббл наверх) / select (выбор слова).
  // dedup bubbling разводит вложенные кнопки и тайл.
  onClick: ({ target, store, next }) => {
    const p = target.payload as { id?: number; audioUrl?: string | null } | undefined;
    // Озвучка — app-глобальный concern (движок + плеер в Features.App):
    // пассивный баббл, payload (audio.url) доезжает нетронутым.
    if (p && 'audioUrl' in p) return next();
    if (p?.id != null) store.update({ selectedId: p.id });
  },
}));

export default Library;
