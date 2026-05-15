const Auth = Feature((api) => {
  return {
    initial: 'login',
    states: {
      login: {
        onClick: ({ target }) => {
          api.router.goTo('/branches');
        },
      },
      idle: {
        authByLogin: async ({ target, state }) => {
          console.log('authByLogin', target);
          return new Promise((resolve) => {
            setTimeout(() => resolve('authByLogin'), 2000);
          });
        },
      },
    },
  };
});
