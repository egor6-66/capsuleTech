import type { JSX } from 'solid-js';

/** Один раздел-карточка лаунчера. */
export interface ILauncherItem {
  /** Стабильный id раздела — приходит в `onSelect`. */
  id: string;
  /** Заголовок карточки раздела. */
  label: string;
  /** Опциональное описание под заголовком. */
  description?: string;
}

/**
 * Launcher — stateless hero + грид кликабельных карточек. Роутер/emit ему не
 * известны: клик/Enter/Space по карточке отдаёт `id` наружу через `onSelect`.
 */
export interface ILauncherProps {
  /** Разделы-карточки в порядке отображения. */
  items: readonly ILauncherItem[];
  /** Клик/Enter/Space по карточке — отдаёт её id. */
  onSelect: (id: string) => void;
  /** Заголовок hero (H1). Не задан — блок hero не рисуется. */
  title?: string;
  /** Подзаголовок hero (muted). */
  description?: string;
  /** Подсказка внизу (muted, small). */
  hint?: string;
  /** Имя пресета вида — резолвится в конфиг (см. `launcher.presets.ts`). Default — `'default'`. */
  preset?: string;
  /** Passthrough-класс на корневой контейнер. */
  class?: string;
  /** Passthrough-стиль на корневой контейнер. */
  style?: JSX.CSSProperties | string;
}
