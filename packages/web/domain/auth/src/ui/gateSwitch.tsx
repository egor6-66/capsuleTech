/**
 * AuthGateSwitch — ссылка-переключатель под формой: вход ↔ регистрация.
 *
 * Stateless web-core `View`. Рендерится ВНУТРИ Gate-FSM scope (`Auth.Gate`):
 *  - текущий режим читает реактивно из FSM context.data.mode
 *    (`store.update({ mode })` в Gate-хендлере), как loginForm читает errorMessage;
 *  - клик — стандартный UiProxy meta-tags путь: теги `to-register`/`to-login`
 *    диспатчатся в Gate-FSM (ближайший Controller-scope), НЕ callback-проп.
 *
 * При отсутствии контекста (storybook / out-of-scope) — режим 'login'.
 */

import { useCtx, View } from '@capsuletech/web-core';
import type { AuthGateMode } from '../types';

// ─── Props ────────────────────────────────────────────────────────────────────

export interface IAuthGateSwitchProps {
  /** Текст ссылки login→register. @default 'Нет аккаунта? Зарегистрироваться' */
  toRegisterLabel?: string;
  /** Текст ссылки register→login. @default 'Уже есть аккаунт? Войти' */
  toLoginLabel?: string;
}

// ─── AuthGateSwitch — web-core View ───────────────────────────────────────────

export const AuthGateSwitch = View<IAuthGateSwitchProps>((Ui, props) => {
  const ctx = useCtx();
  const mode = () => (ctx?.store?.ctx?.data?.mode as AuthGateMode | undefined) ?? 'login';

  return (
    <Ui.Flow.Show
      when={mode() === 'register'}
      fallback={
        <Ui.Button variant="link" meta={{ tags: ['to-register'] }}>
          {props.toRegisterLabel ?? 'Нет аккаунта? Зарегистрироваться'}
        </Ui.Button>
      }
    >
      <Ui.Button variant="link" meta={{ tags: ['to-login'] }}>
        {props.toLoginLabel ?? 'Уже есть аккаунт? Войти'}
      </Ui.Button>
    </Ui.Flow.Show>
  );
});

export default AuthGateSwitch;
