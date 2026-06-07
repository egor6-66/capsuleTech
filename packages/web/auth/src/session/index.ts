/**
 * @capsuletech/web-auth/session
 *
 * Хранение сессии (токен + current-user/role) + хук `useAuth()` для чтения
 * роли/статуса в любом слое аппа. Общий для всех стратегий.
 *
 * TODO(owner-web-auth): реализовать session-store (web-state) + `useAuth()`:
 *   const { user, role, status, isAuthed, login, logout } = useAuth();
 * Токен-хранилище (memory/localStorage) — config-driven, не хардкод.
 * Air-gapped: никаких внешних URL по умолчанию (см. OWNERSHIP).
 */

import type { IAuthSession } from '../types';

/** Начальная (неаутентифицированная) сессия. */
export const emptySession: IAuthSession = {
  token: null,
  user: null,
  status: 'idle',
};

// TODO(owner-web-auth): export const useAuth = () => { ... }
