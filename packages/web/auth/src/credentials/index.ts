/**
 * @capsuletech/web-auth/credentials — СТРАТЕГИЯ: логин + пароль.
 *
 * Итерация после /role. Та же форма блока (endpoint-контракт + auth-FSM-конфиг
 * + config-driven form-блок), параметризованная полями login/password.
 *
 * TODO(owner-web-auth): реализовать `credentialsStrategy: IAuthStrategy<ICredentialsInput>`.
 */

import type { IAuthStrategy } from '../types';

/** Input стратегии «логин+пароль». */
export interface ICredentialsInput {
  login: string;
  password: string;
}

export type CredentialsStrategy = IAuthStrategy<ICredentialsInput>;
