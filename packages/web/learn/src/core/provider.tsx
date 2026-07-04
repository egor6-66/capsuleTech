/**
 * Learn.Provider — тонкий провайдер верхнего уровня обучающего flow
 * (зеркало WebStudio.Provider). Прокидывает `apiBase` вниз через
 * `ApiBaseContext` — единственный источник learn-BFF адреса для
 * пакетных data-слоёв (`library/api.ts`, будущие lesson/progress).
 *
 * Регистрируется как `Learn.Provider` через `../capsule` (ADR 033).
 */
import type { JSX } from 'solid-js';
import { ApiBaseContext, DEFAULT_API_BASE } from './apiContext';

export interface ILearnProviderProps {
  /** База learn-BFF (ADR 055). Дефолт '' (относительные пути). */
  apiBase?: string;
  children: JSX.Element;
}

export const LearnProvider = (props: ILearnProviderProps): JSX.Element => (
  <ApiBaseContext.Provider value={props.apiBase ?? DEFAULT_API_BASE}>
    {props.children}
  </ApiBaseContext.Provider>
);
