import { createContext, useContext } from 'solid-js';
import type { ICapsuleRouter } from './types';

/**
 * Solid-контекст для capsule-обёртки роутера.
 *
 * Заполняется в `Providers.Base` после создания роутера. Доступен через `useRouter()`
 * из любого Component/Wrapper в дереве (включая `createLogicWrapper`).
 */
export const RouterContext = createContext<ICapsuleRouter | null>(null);

/**
 * Получить capsule-обёртку роутера. Бросает, если используется вне `Providers.Base`.
 *
 * Намеренно не делаем silent-null fallback — отсутствие провайдера это баг,
 * а не валидное состояние; явная ошибка лучше скрытого `undefined.goTo`.
 */
export const useRouter = (): ICapsuleRouter => {
  const r = useContext(RouterContext);
  if (!r) {
    throw new Error(
      '[capsule/router] useRouter() called outside <Providers.Base>. ' +
        'Make sure your component tree is wrapped in Providers.Base.',
    );
  }
  return r;
};
