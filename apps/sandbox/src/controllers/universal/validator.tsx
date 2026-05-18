const Validator = Controller(() => {
  return {
    initial: 'idle',
    states: {
      idle: {
        onClick: async ({ next, store, state, context }) => {
          const r = await next.with('hello');
          console.log('responseeeeee', r);
        },
      },
    },
  };
});

export default Validator;
