const Form = Controller(() => ({
  initial: 'idle',
  states: {
    idle: {
      onClick: async ({ target, store, next, state }) => {
        if (!target.meta?.tags?.includes('submit')) return;

        // `pick` ходит в `context.components` (только статичные props/meta — value там нет),
        // а текущие значения инпутов живут в `context.data[id]` (туда UiProxy
        // кладёт `{ name, value, ... }` через SET_DATA на onInput). Поэтому
        // берём ids из pick и достаём value из data.
        const inputs = store.pick(['@inputs']);
        const data = (store.ctx as any).data ?? {};
        const payload = Object.keys(inputs).reduce<Record<string, unknown>>((acc, id) => {
          const entry = data[id];
          if (entry?.name) acc[entry.name] = entry.value;
          return acc;
        }, {});

        state.set('loading');
        try {
          await next.with(payload);
          state.set('idle');
        } catch (err) {
          store.setErrors({ form: String(err) });
          state.set('error');
        }
      },
    },
    loading: {},
    error: {
      onClick: async ({ state }) => {
        state.set('idle');
      },
    },
  },
}));

export default Form;
