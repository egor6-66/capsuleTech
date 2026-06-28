/**
 * Learn.Provider — тонкий провайдер верхнего уровня обучающего flow
 * (зеркало WebStudio.Provider). Будущий дом для learn-контекста (apiBase,
 * текущий модуль, кэш контента). В скелете тело — passthrough; контекст
 * появится при backend-интеграции (ADR 055 D2 — endpoints через web-query).
 *
 * Регистрируется как `Learn.Provider` через `../capsule` (ADR 033).
 */
import type { JSX } from 'solid-js';

export interface ILearnProviderProps {
  /** База learn-BFF (ADR 055). На скелете не используется. */
  apiBase?: string;
  children: JSX.Element;
}

export const LearnProvider = (props: ILearnProviderProps): JSX.Element => <>{props.children}</>;
