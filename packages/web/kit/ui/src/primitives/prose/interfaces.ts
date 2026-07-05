import type { VariantProps } from 'class-variance-authority';
import type { Component, JSX } from 'solid-js';
import type { proseCva } from './variants';

export type ProseVariants = VariantProps<typeof proseCva>;

export interface IProseProps extends JSX.HTMLAttributes<HTMLElement>, ProseVariants {
  /**
   * Плотность типографики.
   * - `'md'` (default) — документ-режим: полноразмерные заголовки, просторный ритм.
   * - `'sm'` — компакт для боковых панелей / studio Info: сжатые заголовки, тело 14px.
   */
  size?: 'sm' | 'md';
  /**
   * Rendered-markdown HTML (например из `renderMarkdown` пакета web-docs).
   * Инжектится как `innerHTML` — контент должен быть **курируемым/доверенным**
   * (тот же контракт, что у `DocSection` / learn `Markdown`). Взаимоисключим с
   * `children`: если задан `innerHTML`, `children` игнорируются.
   */
  innerHTML?: string;
  /**
   * Явный override корневого тега (runtime polymorphism). Дефолт — `'div'`.
   * Для семантики статьи можно `as="article"`.
   */
  as?: string | Component<any>;
  /** JSX-контент — альтернатива `innerHTML` (`<Prose>{jsx}</Prose>`). */
  children?: JSX.Element;
}
