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
  context: {
    senses: [] as unknown[],
    selectedId: null as number | null,
    engine: 'kokoro' as string, // выбранный TTS-движок (свитчер)
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

  // Клик: setEngine (свитчер движка) / speak (озвучка выбранным движком) / select (выбор).
  // dedup bubbling разводит вложенные кнопки и тайл. Base — dev-хардкод (позже из конфига).
  onClick: ({ target, store, context }) => {
    const p = target.payload as
      | { id?: number; speak?: string; setEngine?: string }
      | undefined;
    if (p?.setEngine) {
      store.update({ engine: p.setEngine });
      return;
    }
    if (p?.speak) {
      const c = context as any;
      const engine = c?.data?.engine ?? c?.engine ?? 'kokoro';
      void new Audio(
        `http://127.0.0.1:8003/learn/voice/speak?text=${encodeURIComponent(p.speak)}&engine=${engine}`,
      ).play();
      return;
    }
    if (p?.id != null) store.update({ selectedId: p.id });
  },
}));

export default Library;
