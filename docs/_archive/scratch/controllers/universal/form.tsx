const Form = Controller(() => {
  return {
    initial: 'idle',
    states: {
      idle: {
        onClick: async ({ target, context, next, store, state }) => {
          console.log(JSON.stringify(store.ctx.components, null, 2));
        },
      },
    },
  };
});
