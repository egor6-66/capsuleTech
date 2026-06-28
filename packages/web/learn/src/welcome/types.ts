/**
 * Типы welcome-панели learn. Декоративные текстовые поля вокруг карточек —
 * параметризуемы; сами карточки (сегменты) берутся из `./segments`.
 */
export interface IWelcomeProps {
  title?: string;
  description?: string;
  hint?: string;
}

export const DEFAULT_TITLE = 'Learn';
export const DEFAULT_DESCRIPTION = 'Выберите раздел, чтобы начать обучение.';
export const DEFAULT_HINT = 'Контент придёт с backend/learn (ADR 055).';
