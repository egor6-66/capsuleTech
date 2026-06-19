/**
 * Типы welcome-панели. Декоративные текстовые поля вокруг карточек —
 * параметризуемы; сами карточки (сегменты) берутся из `navigation/segments`.
 */

export interface IWelcomeProps {
  /** Заголовок страницы. По умолчанию «Web Studio». */
  title?: string;
  /** Описание под заголовком. */
  description?: string;
  /** Подсказка в нижней части. По умолчанию «Выберите раздел выше.» */
  hint?: string;
}

export const DEFAULT_TITLE = 'Web Studio';
export const DEFAULT_DESCRIPTION =
  "Рабочее пространство для проектирования. Композитор manifest'ов компонентов, операций над JSON-деревом, inspector'а пропсов и DnD-сборки. Инструменты web devOps и performance monitor.";
export const DEFAULT_HINT = 'Выберите раздел выше.';
