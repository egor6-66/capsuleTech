/**
 * IInspectorKit — минимальный набор UI-примитивов, который Inspector использует
 * для рендера полей.
 *
 * Инъектируется через props, чтобы `/inspector` оставался kit-agnostic:
 * любой потребитель может передать собственные компоненты, соответствующие
 * интерфейсу.
 *
 * По умолчанию (`DEFAULT_KIT`) используется `@capsuletech/web-ui`.
 */

import { Input } from '@capsuletech/web-ui/input';
import { Select } from '@capsuletech/web-ui/select';
import { Textarea } from '@capsuletech/web-ui/textarea';
import { Toggle } from '@capsuletech/web-ui/toggle';
import type { ISelectOption } from '@capsuletech/web-ui/select';
import type { IToggleProps } from '@capsuletech/web-ui/toggle';
import type { Component, JSX } from 'solid-js';

export type { ISelectOption };

/** Props для Input — это стандартные HTMLInput атрибуты (Solid JSX). */
export type InputKitProps = Omit<JSX.InputHTMLAttributes<HTMLInputElement>, 'size'>;

/**
 * Props для kit.Select.
 * onChange принимает `string` (null уже отфильтрован в DEFAULT_KIT-обёртке).
 */
export interface SelectKitProps {
  options?: ISelectOption[];
  value?: string;
  disabled?: boolean;
  /** Вызывается только при непустом выборе (null пропускается). */
  onChange?: (v: string) => void;
  placeholder?: string;
  class?: string;
}

/**
 * Props для kit.Textarea.
 * Повторяем ключевые атрибуты textarea (без CVA size чтобы не тянуть тип из web-ui).
 */
export interface TextareaKitProps extends Omit<JSX.TextareaHTMLAttributes<HTMLTextAreaElement>, 'size'> {
  resize?: 'none' | 'vertical' | 'horizontal' | 'both';
}

export interface IInspectorKit {
  /** Текстовый / числовой ввод (тип задаётся через `type` prop). */
  Input: Component<InputKitProps>;
  /** Булев переключатель. */
  Toggle: Component<IToggleProps>;
  /** Select (выпадающий список) — на базе @kobalte/core/select. */
  Select: Component<SelectKitProps>;
  /** Многострочный ввод — CVA size + resize prop. */
  Textarea: Component<TextareaKitProps>;
}

/**
 * Обёртка над Select из @capsuletech/web-ui:
 * адаптирует onChange(string | null) → onChange(string), фильтруя null.
 */
const InspectorSelect: Component<SelectKitProps> = (props) => {
  const handleChange = (v: string | null) => {
    if (v != null) props.onChange?.(v);
  };
  return (
    <Select
      options={props.options}
      value={props.value}
      disabled={props.disabled}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      onChange={handleChange as any}
      placeholder={props.placeholder}
      class={props.class}
    />
  );
};

/**
 * Дефолтный кит из `@capsuletech/web-ui`.
 */
export const DEFAULT_KIT: IInspectorKit = {
  Input: Input as Component<InputKitProps>,
  Toggle,
  Select: InspectorSelect,
  Textarea: Textarea as Component<TextareaKitProps>,
};
