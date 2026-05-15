/**
 * Chat controller — ловит submit (click на `send` или Enter на `input`),
 * вытаскивает текущее значение инпута из store.ctx.data[inputId] и
 * пробрасывает текст наверх через `next(text)`. Feature слушает как
 * `sendMessage` (через overrides на Widget-уровне).
 */
const readInput = (store: any): string => {
  const inputs = store.pick(['input']);
  const data = store.ctx?.data ?? {};
  for (const id of Object.keys(inputs)) {
    const value = data[id]?.value;
    if (typeof value === 'string' && value.length) return value;
  }
  return '';
};

const submit = async ({ store, next, state }: any) => {
  const text = readInput(store).trim();
  if (!text) return;

  state.set('sending');
  try {
    await next(text);
  } finally {
    state.set('idle');
  }
};

const Main = Controller(() => ({
  initial: 'idle',
  states: {
    idle: {
      onClick: async (api: any) => {
        if (!api.target.meta?.tags?.includes('send')) return;
        await submit(api);
      },
      onKeyDown: async (api: any) => {
        if (!api.target.meta?.tags?.includes('input')) return;
        if (api.target.key !== 'Enter' || api.target.modifiers?.shift) return;
        await submit(api);
      },
    },
    sending: {},
  },
}));

export default Main;
