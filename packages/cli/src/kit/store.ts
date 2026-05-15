import Conf from 'conf';

export const createStore = <T extends Record<string, unknown>>(name: string, defaults: T) => {
  return new Conf({ projectName: name, defaults });
};
