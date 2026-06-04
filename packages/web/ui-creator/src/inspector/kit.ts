/**
 * IInspectorKit — минимальный набор UI-примитивов, который Inspector использует
 * для рендера полей.
 *
 * Инъектируется через props, чтобы `/inspector` оставался kit-agnostic:
 * любой потребитель может передать собственные компоненты, соответствующие
 * интерфейсу.
 *
 * По умолчанию (`DEFAULT_KIT`) используется `@capsuletech/web-ui`.
 *
 * GAP (для owner-web-ui):
 *  - `Select` — нет в @capsuletech/web-ui; `SelectField` и выбор единицы в
 *    `NumberUnitField` используют нативный <select> как fallback.
 *  - `Textarea` — нет в @capsuletech/web-ui; `TextareaField` использует
 *    нативный <textarea> как fallback.
 */

import { Input } from '@capsuletech/web-ui/input';
import { Toggle } from '@capsuletech/web-ui/toggle';
import type { IToggleProps } from '@capsuletech/web-ui/toggle';
import type { Component, JSX } from 'solid-js';

/** Props для Input — это стандартные HTMLInput атрибуты (Solid JSX). */
export type InputKitProps = Omit<JSX.InputHTMLAttributes<HTMLInputElement>, 'size'>;

export interface IInspectorKit {
  /** Текстовый / числовой ввод (тип задаётся через `type` prop). */
  Input: Component<InputKitProps>;
  /** Булев переключатель. */
  Toggle: Component<IToggleProps>;
  /**
   * Select (выпадающий список). Если не передан — используется нативный <select>.
   *
   * GAP: @capsuletech/web-ui не экспортирует Select-компонент.
   * Эскалировать owner-web-ui: нужен Select на базе Kobalte Select/Listbox.
   */
  Select?: Component<{
    value?: string;
    disabled?: boolean;
    onChange?: (v: string) => void;
    children?: JSX.Element;
  }>;
  /**
   * Многострочный ввод. Если не передан — используется нативный <textarea>.
   *
   * GAP: @capsuletech/web-ui не экспортирует Textarea-компонент.
   * Эскалировать owner-web-ui: нужен Textarea с теми же CVA-вариантами что у Input.
   */
  Textarea?: Component<{
    value?: string;
    rows?: number;
    placeholder?: string;
    disabled?: boolean;
    class?: string;
    onInput?: (e: InputEvent & { currentTarget: HTMLTextAreaElement }) => void;
  }>;
}

/**
 * Дефолтный кит из `@capsuletech/web-ui`.
 * Select и Textarea — undefined (нет в ките, fallback на нативные элементы).
 */
export const DEFAULT_KIT: IInspectorKit = { Input: Input as Component<InputKitProps>, Toggle };
