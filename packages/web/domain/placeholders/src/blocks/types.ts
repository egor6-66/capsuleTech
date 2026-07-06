/**
 * Контракты блоков-плейсхолдеров: props (текстовые оверрайды) + phantom-события.
 *
 * Каждое `I<Block>Events` описывает payload-тип именованных событий, которые
 * блок эмитит через `useEmitOptional` (ADR 032). Codegen читает phantom
 * `__events` на компоненте и генерит `Placeholders.<Block>.Events` — апп ловит
 * их доменной Feature:
 *
 *   Feature<EventsOf<typeof Placeholders.NotFound>>(({ router }) => ({
 *     onHome: () => router.goTo('/'),
 *   }));
 *
 * Payload у всех событий — `void`: плейсхолдеру нечего передавать, апп сам
 * решает, куда вести (навигация/повтор/логин — концерн приложения).
 */

import type { JSX } from 'solid-js';

// ─── NotFound (404) ──────────────────────────────────────────────────────────

export interface INotFoundEvents {
  /** Клик по «на главную». Payload отсутствует — куда вести решает апп. */
  onHome: Record<string, never>;
}

export interface INotFoundProps {
  title?: string;
  description?: string;
  actionLabel?: string;
}

// ─── Error (что-то пошло не так) ─────────────────────────────────────────────

export interface IErrorEvents {
  /** Клик по «повторить». Payload отсутствует. */
  onRetry: Record<string, never>;
}

export interface IErrorProps {
  title?: string;
  description?: string;
  actionLabel?: string;
}

// ─── AccessDenied (нет прав на просмотр) ─────────────────────────────────────

export interface IAccessDeniedEvents {
  /** Клик по «войти». Payload отсутствует. */
  onLogin: Record<string, never>;
}

export interface IAccessDeniedProps {
  title?: string;
  description?: string;
  actionLabel?: string;
}

// ─── Community (доступ только для сообщества) ────────────────────────────────

export interface ICommunityEvents {
  /** Клик по «присоединиться». Payload отсутствует. */
  onJoin: Record<string, never>;
}

export interface ICommunityProps {
  title?: string;
  description?: string;
  actionLabel?: string;
}

// ─── WidgetUnavailable (встраиваемый, вместо упавшего виджета) ────────────────

export interface IWidgetUnavailableEvents {
  /** Клик по «обновить». Payload отсутствует. */
  onRetry: Record<string, never>;
}

export interface IWidgetUnavailableProps {
  title?: string;
  description?: string;
  actionLabel?: string;
}

// ─── Empty (нейтральное пусто, не ошибка) ────────────────────────────────────

export interface IEmptyEvents {
  /**
   * Клик по действию. Эмитится ТОЛЬКО когда потребитель задал `actionLabel`;
   * без него блок — чистое информационное пусто (ни кнопки, ни события).
   */
  onAction: Record<string, never>;
}

export interface IEmptyProps {
  title?: string;
  description?: string;
  /** Опц. override дефолтной нейтральной иконки (по умолчанию `Inbox`). */
  icon?: JSX.Element;
  /** Если задан — рисуется action и по клику эмитится `onAction`. */
  actionLabel?: string;
  /** Компактный вариант — для узких слотов (правая панель, встройка). */
  compact?: boolean;
}
