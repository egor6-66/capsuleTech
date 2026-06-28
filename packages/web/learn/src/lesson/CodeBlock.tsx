/**
 * Learn.CodeBlock — фрагмент кода в уроке. SKELETON: сырой <pre>, без подсветки.
 * Подсветка (Shiki/Monaco) — последующая итерация.
 */
import type { Component } from 'solid-js';

export interface ICodeBlockProps {
  code: string;
  lang?: string;
}

export const CodeBlock: Component<ICodeBlockProps> = (props) => (
  <pre data-stub="Learn.CodeBlock" data-lang={props.lang}>
    <code>{props.code}</code>
  </pre>
);
