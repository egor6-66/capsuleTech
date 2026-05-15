const Validator = Controller(() => {
  return {
    initial: 'idle',
    states: {
      idle: {
        onClick: async ({ next, store, state, context }) => {
          const r = await next('hello');
          console.log('responseeeeee', r);
        },
      },
    },
  };
});
