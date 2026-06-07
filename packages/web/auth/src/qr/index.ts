/**
 * @capsuletech/web-auth/qr — СТРАТЕГИЯ: вход по QR-коду.
 *
 * Итерация. Polling/long-poll за подтверждением скана; auth-FSM расширяется
 * шагом ожидания. Endpoint-контракт выдаёт challenge + статус.
 *
 * TODO(owner-web-auth): реализовать `qrStrategy: IAuthStrategy<IQrInput>`.
 */

import type { IAuthStrategy } from '../types';

/** Input стратегии «по QR» (challenge-id из выданного кода). */
export interface IQrInput {
  challengeId: string;
}

export type QrStrategy = IAuthStrategy<IQrInput>;
