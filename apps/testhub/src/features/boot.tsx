/**
 * Boot feature — entry redirect для `/`.
 *
 * Хаб не требует авторизации. При старте с корневого URL `/`
 * сразу редиректит на `/workspace` (единственный content-роут).
 */
const Boot = Feature(({ router }) => ({
  initial: 'idle',

  states: {
    idle: {
      onInit: () => {
        if (router.current() !== '/') return;
        router.goTo('/workspace');
      },
    },
  },
}));

export default Boot;
