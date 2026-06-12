/**
 * @capsuletech/web-auth/oauth2 — СТРАТЕГИЯ: OAuth 2.0 flow.
 *
 * Итерация. Redirect/PKCE-флоу через провайдера; auth-FSM расширяется шагом
 * редиректа/коллбэка. Air-gapped: провайдер/URL — config-driven (props аппа),
 * НЕ хардкодить (см. OWNERSHIP).
 *
 * TODO(owner-web-auth): реализовать `oauth2Strategy: IAuthStrategy<IOAuth2Input>`.
 */

import type { IAuthStrategy } from '../types';

/** Конфиг стратегии OAuth 2.0 (провайдер задаёт апп). */
export interface IOAuth2Input {
  provider: string;
  redirectUri: string;
}

export type OAuth2Strategy = IAuthStrategy<IOAuth2Input>;
